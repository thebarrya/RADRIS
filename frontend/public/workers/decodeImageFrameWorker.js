import bilinear from './shared/scaling/bilinear';
import replicate from './shared/scaling/replicate';
import { expose } from 'comlink';
import decodeLittleEndian from './shared/decoders/decodeLittleEndian';
import decodeBigEndian from './shared/decoders/decodeBigEndian';
import decodeRLE from './shared/decoders/decodeRLE';
import decodeJPEGBaseline8Bit from './shared/decoders/decodeJPEGBaseline8Bit';
import decodeJPEGBaseline12Bit from './shared/decoders/decodeJPEGBaseline12Bit-js';
import decodeJPEGLossless from './shared/decoders/decodeJPEGLossless';
import decodeJPEGLS from './shared/decoders/decodeJPEGLS';
import decodeJPEG2000 from './shared/decoders/decodeJPEG2000';
import decodeHTJ2K from './shared/decoders/decodeHTJ2K';
import applyModalityLUT from './shared/scaling/scaleArray';
import getMinMax from './shared/getMinMax';
import getPixelDataTypeFromMinMax, { validatePixelDataType, } from './shared/getPixelDataTypeFromMinMax';
import isColorImage from './shared/isColorImage';
const imageUtils = {
    bilinear,
    replicate,
};
const typedArrayConstructors = {
    Uint8Array,
    Uint16Array,
    Int16Array,
    Float32Array,
    Uint32Array,
};
function postProcessDecodedPixels(imageFrame, options, start, decodeConfig) {
    const shouldShift = imageFrame.pixelRepresentation !== undefined &&
        imageFrame.pixelRepresentation === 1;
    const shift = shouldShift && imageFrame.bitsStored !== undefined
        ? 32 - imageFrame.bitsStored
        : undefined;
    if (shouldShift && shift !== undefined) {
        for (let i = 0; i < imageFrame.pixelData.length; i++) {
            imageFrame.pixelData[i] = (imageFrame.pixelData[i] << shift) >> shift;
        }
    }
    let pixelDataArray = imageFrame.pixelData;
    imageFrame.pixelDataLength = imageFrame.pixelData.length;
    const { min: minBeforeScale, max: maxBeforeScale } = getMinMax(imageFrame.pixelData);
    const canRenderFloat = typeof options.allowFloatRendering !== 'undefined'
        ? options.allowFloatRendering
        : true;
    let invalidType = isColorImage(imageFrame.photometricInterpretation) &&
        options.targetBuffer?.offset === undefined;
    const willScale = options.preScale?.enabled;
    const hasFloatRescale = willScale &&
        Object.values(options.preScale.scalingParameters).some((v) => typeof v === 'number' && !Number.isInteger(v));
    const disableScale = !options.preScale.enabled || (!canRenderFloat && hasFloatRescale);
    const type = options.targetBuffer?.type;
    if (type && options.preScale.enabled && !disableScale) {
        const scalingParameters = options.preScale.scalingParameters;
        const scaledValues = _calculateScaledMinMax(minBeforeScale, maxBeforeScale, scalingParameters);
        invalidType = !validatePixelDataType(scaledValues.min, scaledValues.max, typedArrayConstructors[type]);
    }
    if (type && !invalidType) {
        pixelDataArray = _handleTargetBuffer(options, imageFrame, typedArrayConstructors, pixelDataArray);
    }
    else if (options.preScale.enabled && !disableScale) {
        pixelDataArray = _handlePreScaleSetup(options, minBeforeScale, maxBeforeScale, imageFrame);
    }
    else {
        pixelDataArray = _getDefaultPixelDataArray(minBeforeScale, maxBeforeScale, imageFrame);
    }
    let minAfterScale = minBeforeScale;
    let maxAfterScale = maxBeforeScale;
    if (options.preScale.enabled && !disableScale) {
        const scalingParameters = options.preScale.scalingParameters;
        _validateScalingParameters(scalingParameters);
        const isRequiredScaling = _isRequiredScaling(scalingParameters);
        if (isRequiredScaling) {
            applyModalityLUT(pixelDataArray, scalingParameters);
            imageFrame.preScale = {
                ...options.preScale,
                scaled: true,
            };
            const scaledValues = _calculateScaledMinMax(minBeforeScale, maxBeforeScale, scalingParameters);
            minAfterScale = scaledValues.min;
            maxAfterScale = scaledValues.max;
        }
    }
    else if (disableScale) {
        imageFrame.preScale = {
            enabled: true,
            scaled: false,
        };
        minAfterScale = minBeforeScale;
        maxAfterScale = maxBeforeScale;
    }
    imageFrame.pixelData = pixelDataArray;
    imageFrame.smallestPixelValue = minAfterScale;
    imageFrame.largestPixelValue = maxAfterScale;
    const end = new Date().getTime();
    imageFrame.decodeTimeInMS = end - start;
    return imageFrame;
}
function _isRequiredScaling(scalingParameters) {
    const { rescaleSlope, rescaleIntercept, modality, doseGridScaling, suvbw } = scalingParameters;
    const hasRescaleValues = typeof rescaleSlope === 'number' && typeof rescaleIntercept === 'number';
    const isRTDOSEWithScaling = modality === 'RTDOSE' && typeof doseGridScaling === 'number';
    const isPTWithSUV = modality === 'PT' && typeof suvbw === 'number';
    return hasRescaleValues || isRTDOSEWithScaling || isPTWithSUV;
}
function _handleTargetBuffer(options, imageFrame, typedArrayConstructors, pixelDataArray) {
    const { arrayBuffer, type, offset: rawOffset = 0, length: rawLength, rows, } = options.targetBuffer;
    const TypedArrayConstructor = typedArrayConstructors[type];
    if (!TypedArrayConstructor) {
        throw new Error(`target array ${type} is not supported, or doesn't exist.`);
    }
    if (rows && rows != imageFrame.rows) {
        scaleImageFrame(imageFrame, options.targetBuffer, TypedArrayConstructor);
    }
    const imageFrameLength = imageFrame.pixelDataLength;
    const offset = rawOffset;
    const length = rawLength !== null && rawLength !== undefined
        ? rawLength
        : imageFrameLength - offset;
    const imageFramePixelData = imageFrame.pixelData;
    if (length !== imageFramePixelData.length) {
        throw new Error(`target array for image does not have the same length (${length}) as the decoded image length (${imageFramePixelData.length}).`);
    }
    const typedArray = arrayBuffer
        ? new TypedArrayConstructor(arrayBuffer, offset, length)
        : new TypedArrayConstructor(length);
    typedArray.set(imageFramePixelData, 0);
    pixelDataArray = typedArray;
    return pixelDataArray;
}
function _handlePreScaleSetup(options, minBeforeScale, maxBeforeScale, imageFrame) {
    const scalingParameters = options.preScale.scalingParameters;
    _validateScalingParameters(scalingParameters);
    const scaledValues = _calculateScaledMinMax(minBeforeScale, maxBeforeScale, scalingParameters);
    return _getDefaultPixelDataArray(scaledValues.min, scaledValues.max, imageFrame);
}
function _getDefaultPixelDataArray(min, max, imageFrame) {
    const TypedArrayConstructor = getPixelDataTypeFromMinMax(min, max);
    const typedArray = new TypedArrayConstructor(imageFrame.pixelData.length);
    typedArray.set(imageFrame.pixelData, 0);
    return typedArray;
}
function _calculateScaledMinMax(minValue, maxValue, scalingParameters) {
    const { rescaleSlope, rescaleIntercept, modality, doseGridScaling, suvbw } = scalingParameters;
    if (modality === 'PT' && typeof suvbw === 'number' && !isNaN(suvbw)) {
        return {
            min: suvbw * (minValue * rescaleSlope + rescaleIntercept),
            max: suvbw * (maxValue * rescaleSlope + rescaleIntercept),
        };
    }
    else if (modality === 'RTDOSE' &&
        typeof doseGridScaling === 'number' &&
        !isNaN(doseGridScaling)) {
        return {
            min: minValue * doseGridScaling,
            max: maxValue * doseGridScaling,
        };
    }
    else if (typeof rescaleSlope === 'number' &&
        typeof rescaleIntercept === 'number') {
        return {
            min: rescaleSlope * minValue + rescaleIntercept,
            max: rescaleSlope * maxValue + rescaleIntercept,
        };
    }
    else {
        return {
            min: minValue,
            max: maxValue,
        };
    }
}
function _validateScalingParameters(scalingParameters) {
    if (!scalingParameters) {
        throw new Error('options.preScale.scalingParameters must be defined if preScale.enabled is true, and scalingParameters cannot be derived from the metadata providers.');
    }
}
function createDestinationImage(imageFrame, targetBuffer, TypedArrayConstructor) {
    const { samplesPerPixel } = imageFrame;
    const { rows, columns } = targetBuffer;
    const typedLength = rows * columns * samplesPerPixel;
    const pixelData = new TypedArrayConstructor(typedLength);
    const bytesPerPixel = pixelData.byteLength / typedLength;
    return {
        pixelData,
        rows,
        columns,
        frameInfo: {
            ...imageFrame.frameInfo,
            rows,
            columns,
        },
        imageInfo: {
            ...imageFrame.imageInfo,
            rows,
            columns,
            bytesPerPixel,
        },
    };
}
function scaleImageFrame(imageFrame, targetBuffer, TypedArrayConstructor) {
    const dest = createDestinationImage(imageFrame, targetBuffer, TypedArrayConstructor);
    const { scalingType = 'replicate' } = targetBuffer;
    imageUtils[scalingType](imageFrame, dest);
    Object.assign(imageFrame, dest);
    imageFrame.pixelDataLength = imageFrame.pixelData.length;
    return imageFrame;
}
export async function decodeImageFrame(imageFrame, transferSyntax, pixelData, decodeConfig, options, callbackFn) {
    const start = new Date().getTime();
    let decodePromise = null;
    let opts;
    switch (transferSyntax) {
        case '1.2.840.10008.1.2':
        case '1.2.840.10008.1.2.1':
            decodePromise = decodeLittleEndian(imageFrame, pixelData);
            break;
        case '1.2.840.10008.1.2.2':
            decodePromise = decodeBigEndian(imageFrame, pixelData);
            break;
        case '1.2.840.10008.1.2.1.99':
            decodePromise = decodeLittleEndian(imageFrame, pixelData);
            break;
        case '1.2.840.10008.1.2.5':
            decodePromise = decodeRLE(imageFrame, pixelData);
            break;
        case '1.2.840.10008.1.2.4.50':
            opts = {
                ...imageFrame,
            };
            decodePromise = decodeJPEGBaseline8Bit(pixelData, opts);
            break;
        case '1.2.840.10008.1.2.4.51':
            decodePromise = decodeJPEGBaseline12Bit(imageFrame, pixelData);
            break;
        case '1.2.840.10008.1.2.4.57':
            decodePromise = decodeJPEGLossless(imageFrame, pixelData);
            break;
        case '1.2.840.10008.1.2.4.70':
            decodePromise = decodeJPEGLossless(imageFrame, pixelData);
            break;
        case '1.2.840.10008.1.2.4.80':
            opts = {
                signed: imageFrame.pixelRepresentation === 1,
                bytesPerPixel: imageFrame.bitsAllocated <= 8 ? 1 : 2,
                ...imageFrame,
            };
            decodePromise = decodeJPEGLS(pixelData, opts);
            break;
        case '1.2.840.10008.1.2.4.81':
            opts = {
                signed: imageFrame.pixelRepresentation === 1,
                bytesPerPixel: imageFrame.bitsAllocated <= 8 ? 1 : 2,
                ...imageFrame,
            };
            decodePromise = decodeJPEGLS(pixelData, opts);
            break;
        case '1.2.840.10008.1.2.4.90':
            opts = {
                ...imageFrame,
            };
            decodePromise = decodeJPEG2000(pixelData, opts);
            break;
        case '1.2.840.10008.1.2.4.91':
            opts = {
                ...imageFrame,
            };
            decodePromise = decodeJPEG2000(pixelData, opts);
            break;
        case '3.2.840.10008.1.2.4.96':
        case '1.2.840.10008.1.2.4.201':
        case '1.2.840.10008.1.2.4.202':
        case '1.2.840.10008.1.2.4.203':
            opts = {
                ...imageFrame,
            };
            decodePromise = decodeHTJ2K(pixelData, opts);
            break;
        default:
            throw new Error(`no decoder for transfer syntax ${transferSyntax}`);
    }
    if (!decodePromise) {
        throw new Error('decodePromise not defined');
    }
    const decodedFrame = await decodePromise;
    const postProcessed = postProcessDecodedPixels(decodedFrame, options, start, decodeConfig);
    callbackFn?.(postProcessed);
    return postProcessed;
}
const obj = {
    decodeTask({ imageFrame, transferSyntax, decodeConfig, options, pixelData, callbackFn, }) {
        return decodeImageFrame(imageFrame, transferSyntax, pixelData, decodeConfig, options, callbackFn);
    },
};
expose(obj);
