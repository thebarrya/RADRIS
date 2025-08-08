#!/usr/bin/env python3

"""
Script pour créer des fichiers DICOM de test pour RADRIS
Nécessite: pip install pydicom pillow numpy
"""

import os
import sys
import numpy as np
from datetime import datetime
import requests
import json

def create_test_dicom():
    try:
        from pydicom import Dataset, FileDataset, FileMetaDataset
        from pydicom.uid import generate_uid, ExplicitVRLittleEndian
        import pydicom
    except ImportError:
        print("❌ PyDICOM non installé. Installation...")
        os.system("pip install pydicom pillow numpy")
        from pydicom import Dataset, FileDataset, FileMetaDataset
        from pydicom.uid import generate_uid, ExplicitVRLittleEndian
        import pydicom

    print("🏥 Création d'un fichier DICOM de test...")

    # Créer les métadonnées du fichier
    meta = FileMetaDataset()
    meta.FileMetaInformationGroupLength = 0
    meta.MediaStorageSOPClassUID = pydicom.uid.CTImageStorage
    meta.MediaStorageSOPInstanceUID = generate_uid()
    meta.ImplementationClassUID = generate_uid()
    meta.TransferSyntaxUID = ExplicitVRLittleEndian

    # Créer le dataset principal
    ds = FileDataset("test_ct.dcm", {}, file_meta=meta, preamble=b"\0" * 128)

    # Informations patient
    ds.PatientName = "Test^Patient"
    ds.PatientID = "TEST001"
    ds.PatientBirthDate = "19900101"
    ds.PatientSex = "M"

    # Informations étude
    ds.StudyInstanceUID = generate_uid()
    ds.StudyDate = datetime.now().strftime("%Y%m%d")
    ds.StudyTime = datetime.now().strftime("%H%M%S")
    ds.StudyDescription = "Test CT Scan - RADRIS"
    ds.AccessionNumber = "ACC001"

    # Informations série
    ds.SeriesInstanceUID = generate_uid()
    ds.SeriesNumber = "1"
    ds.SeriesDate = datetime.now().strftime("%Y%m%d")
    ds.SeriesTime = datetime.now().strftime("%H%M%S")
    ds.SeriesDescription = "Axial CT"
    ds.Modality = "CT"

    # Informations instance
    ds.SOPInstanceUID = generate_uid()
    ds.SOPClassUID = pydicom.uid.CTImageStorage
    ds.InstanceNumber = "1"

    # Créer une image de test (512x512 pixels)
    image_data = np.random.randint(0, 4096, (512, 512), dtype=np.uint16)
    
    # Paramètres d'image
    ds.Rows = 512
    ds.Columns = 512
    ds.BitsAllocated = 16
    ds.BitsStored = 16
    ds.HighBit = 15
    ds.PixelRepresentation = 0
    ds.SamplesPerPixel = 1
    ds.PhotometricInterpretation = "MONOCHROME2"
    ds.PixelSpacing = [0.5, 0.5]  # mm
    ds.SliceThickness = "5.0"
    ds.WindowCenter = "2048"
    ds.WindowWidth = "4096"
    
    # Ajouter les données pixel
    ds.PixelData = image_data.tobytes()

    # Sauvegarder
    output_file = "/tmp/test_ct_radris.dcm"
    ds.save_as(output_file)
    print(f"✅ DICOM créé: {output_file}")
    
    return output_file

def upload_to_orthanc(dicom_file):
    """Upload le fichier DICOM vers Orthanc"""
    orthanc_url = "http://localhost:8042"
    
    print(f"📤 Upload vers Orthanc: {dicom_file}")
    
    try:
        with open(dicom_file, 'rb') as f:
            response = requests.post(
                f"{orthanc_url}/instances",
                data=f.read(),
                headers={'Content-Type': 'application/dicom'}
            )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Upload réussi!")
            print(f"   ID Instance: {result.get('ID', 'N/A')}")
            print(f"   Statut: {result.get('Status', 'N/A')}")
            return result
        else:
            print(f"❌ Erreur upload: {response.status_code}")
            print(f"   Réponse: {response.text}")
            return None
            
    except requests.exceptions.ConnectionError:
        print("❌ Impossible de se connecter à Orthanc. Vérifiez que le service fonctionne.")
        return None
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return None

def check_orthanc_studies():
    """Vérifier les études dans Orthanc"""
    orthanc_url = "http://localhost:8042"
    
    try:
        response = requests.get(f"{orthanc_url}/studies")
        studies = response.json()
        print(f"📊 Nombre d'études dans Orthanc: {len(studies)}")
        
        if studies:
            print("🗂️  Études disponibles:")
            for study_id in studies:
                # Récupérer les détails de l'étude
                study_response = requests.get(f"{orthanc_url}/studies/{study_id}")
                if study_response.status_code == 200:
                    study_data = study_response.json()
                    main_tags = study_data.get('MainDicomTags', {})
                    patient_name = main_tags.get('PatientName', 'N/A')
                    study_desc = main_tags.get('StudyDescription', 'N/A')
                    study_date = main_tags.get('StudyDate', 'N/A')
                    
                    print(f"   • {patient_name} - {study_desc} ({study_date})")
                    print(f"     StudyInstanceUID: {study_data.get('MainDicomTags', {}).get('StudyInstanceUID', 'N/A')}")
        
    except Exception as e:
        print(f"❌ Erreur lors de la vérification: {e}")

if __name__ == "__main__":
    print("🏥 === Création et Upload DICOM Test - RADRIS === 🏥")
    print()
    
    # Créer le DICOM de test
    dicom_file = create_test_dicom()
    
    if dicom_file:
        # Uploader vers Orthanc
        result = upload_to_orthanc(dicom_file)
        
        if result:
            print()
            print("🔗 Liens utiles:")
            print(f"   • Orthanc Explorer: http://localhost:8042/app/explorer.html")
            print(f"   • OHIF Viewer: http://localhost:3005")
            print(f"   • Stone Web Viewer: http://localhost:8042/ui/app/stone-webviewer/")
            print()
            
            # Vérifier les études
            check_orthanc_studies()
            
        # Nettoyer
        if os.path.exists(dicom_file):
            os.remove(dicom_file)
            print(f"🗑️  Fichier temporaire supprimé: {dicom_file}")
    
    print()
    print("✨ Script terminé!")