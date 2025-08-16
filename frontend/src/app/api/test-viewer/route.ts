import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Mock data for testing the OHIF viewer integration
    const testViewerConfig = {
      studyInstanceUID: '1.2.840.113619.2.5.1762583153.215519.978957063.78',
      wadoRsRoot: 'http://localhost:8043/dicom-web',
      ohifViewerUrl: 'http://localhost:3005/viewer',
      orthancViewerUrl: 'http://localhost:8042/ui/app/',
      stoneViewerUrl: 'http://localhost:8042/ui/app/',
      patient: {
        firstName: 'Test',
        lastName: 'Patient',
        birthDate: '1980-01-01'
      },
      modality: 'CT',
      accessionNumber: 'ACC001'
    };

    // Test OHIF URL generation
    const ohifUrl = `${testViewerConfig.ohifViewerUrl}?StudyInstanceUIDs=${testViewerConfig.studyInstanceUID}&datasources=dicomweb`;
    
    return NextResponse.json({
      message: 'Test viewer endpoint working',
      config: testViewerConfig,
      urls: {
        ohifViewer: ohifUrl,
        orthancExplorer: `${testViewerConfig.orthancViewerUrl}#/studies/${testViewerConfig.studyInstanceUID}`,
        dicomWebStudies: `${testViewerConfig.wadoRsRoot}/studies`,
        dicomWebSpecificStudy: `${testViewerConfig.wadoRsRoot}/studies/${testViewerConfig.studyInstanceUID}`
      },
      instructions: {
        'step1': 'Start the RADRIS system with ./start.sh',
        'step2': 'Upload test DICOM files to Orthanc',
        'step3': 'Use the OHIF URL above to test viewing',
        'step4': 'Check that DICOMweb endpoints are accessible'
      }
    });

  } catch (error: any) {
    console.error('Test viewer error:', error);
    return NextResponse.json(
      { error: 'Failed to generate test viewer configuration', details: error.message },
      { status: 500 }
    );
  }
}