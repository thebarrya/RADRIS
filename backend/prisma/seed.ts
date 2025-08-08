import { PrismaClient, UserRole, Gender, Modality, ExaminationStatus, Priority, ReportStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Hash password for all users
  const hashedPassword = await bcrypt.hash('admin123', 10);

  // Create Users
  console.log('👥 Creating users...');
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@radris.fr' },
    update: {},
    create: {
      email: 'admin@radris.fr',
      firstName: 'Administrateur',
      lastName: 'Système',
      role: UserRole.ADMIN,
      password: hashedPassword,
    },
  });

  const radiologist1 = await prisma.user.upsert({
    where: { email: 'dr.martin@radris.fr' },
    update: {},
    create: {
      email: 'dr.martin@radris.fr',
      firstName: 'Pierre',
      lastName: 'Martin',
      role: UserRole.RADIOLOGIST_SENIOR,
      password: hashedPassword,
    },
  });

  const radiologist2 = await prisma.user.upsert({
    where: { email: 'dr.durand@radris.fr' },
    update: {},
    create: {
      email: 'dr.durand@radris.fr',
      firstName: 'Sophie',
      lastName: 'Durand',
      role: UserRole.RADIOLOGIST_JUNIOR,
      password: hashedPassword,
    },
  });

  const technician = await prisma.user.upsert({
    where: { email: 'tech.bernard@radris.fr' },
    update: {},
    create: {
      email: 'tech.bernard@radris.fr',
      firstName: 'Michel',
      lastName: 'Bernard',
      role: UserRole.TECHNICIAN,
      password: hashedPassword,
    },
  });

  const secretary = await prisma.user.upsert({
    where: { email: 'secretaire@radris.fr' },
    update: {},
    create: {
      email: 'secretaire@radris.fr',
      firstName: 'Marie',
      lastName: 'Leclerc',
      role: UserRole.SECRETARY,
      password: hashedPassword,
    },
  });

  const referrer1 = await prisma.user.upsert({
    where: { email: 'dr.ref1@hopital.fr' },
    update: {},
    create: {
      email: 'dr.ref1@hopital.fr',
      firstName: 'Jean',
      lastName: 'Dupont',
      role: UserRole.RADIOLOGIST_SENIOR,
      password: hashedPassword,
    },
  });

  console.log('✅ Users created');

  // Create Patients
  console.log('👤 Creating patients...');

  const patients = [
    {
      firstName: 'Jean',
      lastName: 'Martin',
      birthDate: new Date('1970-05-15'),
      gender: Gender.M,
      phoneNumber: '0123456789',
      email: 'jean.martin@email.fr',
      address: '123 Rue de la Santé',
      city: 'Paris',
      zipCode: '75010',
      socialSecurity: '1700515123456',
      allergies: ['iode'],
      medicalHistory: ['hypertension'],
      warnings: ['allergy'],
    },
    {
      firstName: 'Marie',
      lastName: 'Durand',
      birthDate: new Date('1985-12-03'),
      gender: Gender.F,
      phoneNumber: '0987654321',
      email: 'marie.durand@email.fr',
      address: '456 Avenue des Fleurs',
      city: 'Lyon',
      zipCode: '69001',
      socialSecurity: '2851203654321',
      allergies: [],
      medicalHistory: ['diabète'],
      warnings: [],
    },
    {
      firstName: 'Pierre',
      lastName: 'Leclerc',
      birthDate: new Date('1992-08-22'),
      gender: Gender.M,
      phoneNumber: '0145678932',
      email: 'pierre.leclerc@email.fr',
      address: '789 Boulevard Victor Hugo',
      city: 'Marseille',
      zipCode: '13001',
      socialSecurity: '1920822789123',
      allergies: [],
      medicalHistory: [],
      warnings: [],
    },
    {
      firstName: 'Sophie',
      lastName: 'Bernard',
      birthDate: new Date('1978-03-10'),
      gender: Gender.F,
      phoneNumber: '0198765432',
      email: 'sophie.bernard@email.fr',
      address: '321 Rue de la République',
      city: 'Toulouse',
      zipCode: '31000',
      socialSecurity: '2780310456789',
      allergies: ['latex'],
      medicalHistory: ['asthme', 'allergie médicamenteuse'],
      warnings: ['allergy', 'pregnancy'],
    },
    {
      firstName: 'Robert',
      lastName: 'Moreau',
      birthDate: new Date('1945-11-28'),
      gender: Gender.M,
      phoneNumber: '0176543298',
      email: 'robert.moreau@email.fr',
      address: '654 Impasse des Tilleuls',
      city: 'Nice',
      zipCode: '06000',
      socialSecurity: '1451128987654',
      allergies: [],
      medicalHistory: ['pacemaker', 'fibrillation auriculaire'],
      warnings: ['pacemaker'],
    },
  ];

  const createdPatients = [];
  for (const patientData of patients) {
    const patient = await prisma.patient.create({
      data: {
        ...patientData,
        createdById: admin.id,
      },
    });
    createdPatients.push(patient);
  }

  console.log('✅ Patients created');

  // Create Report Templates
  console.log('📋 Creating report templates...');

  const templates = [
    {
      name: 'Scanner Thoracique',
      modality: Modality.CT,
      examType: 'Scanner thorax',
      indication: 'Indication: [A compléter]\n\nProduit de contraste: [Oui/Non]',
      technique: 'Scanner thoracique hélicoïdal, coupes fines, reconstructions multiplanaires.',
      findings: 'Parenchyme pulmonaire:\n- [Normal/Anomalies]\n\nPlèvre:\n- [Normale/Anomalies]\n\nMédiastin:\n- [Normal/Anomalies]\n\nParois:\n- [Normales/Anomalies]',
      impression: 'CONCLUSION:\n[A compléter]',
    },
    {
      name: 'IRM Cérébrale',
      modality: Modality.MR,
      examType: 'IRM encéphale',
      indication: 'Indication: [A compléter]\n\nProduit de contraste: [Oui/Non]',
      technique: 'IRM encéphalique avec séquences T1, T2, FLAIR, diffusion.',
      findings: 'Substance blanche:\n- [Normale/Anomalies]\n\nSubstance grise:\n- [Normale/Anomalies]\n\nSystème ventriculaire:\n- [Normal/Anomalies]\n\nTronc cérébral:\n- [Normal/Anomalies]',
      impression: 'CONCLUSION:\n[A compléter]',
    },
    {
      name: 'Radiographie Thoracique',
      modality: Modality.DX,
      examType: 'Radiographie thorax',
      indication: 'Indication: [A compléter]',
      technique: 'Radiographie thoracique de face et profil.',
      findings: 'Poumons:\n- [Normaux/Anomalies]\n\nCœur:\n- [Normal/Anomalies]\n\nMédiastin:\n- [Normal/Anomalies]\n\nParois:\n- [Normales/Anomalies]',
      impression: 'CONCLUSION:\n[A compléter]',
    },
  ];

  for (const templateData of templates) {
    await prisma.reportTemplate.upsert({
      where: { 
        name_modality_examType: {
          name: templateData.name,
          modality: templateData.modality,
          examType: templateData.examType,
        }
      },
      update: {},
      create: templateData,
    });
  }

  console.log('✅ Report templates created');

  // Create Examinations
  console.log('🏥 Creating examinations...');

  const examinations = [
    // Today's examinations
    {
      scheduledDate: new Date(),
      modality: Modality.CT,
      examType: 'Scanner thorax sans injection',
      bodyPart: 'Thorax',
      procedure: 'Scanner thoracique',
      status: ExaminationStatus.SCHEDULED,
      priority: Priority.NORMAL,
      patientId: createdPatients[0].id,
      assignedToId: radiologist1.id,
      referrerId: referrer1.id,
      createdById: secretary.id,
      clinicalInfo: 'Suspicion de nodule pulmonaire. Tabagisme ancien.',
      contrast: false,
    },
    {
      scheduledDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // +2 hours
      modality: Modality.MR,
      examType: 'IRM encéphale',
      bodyPart: 'Crâne',
      procedure: 'IRM cérébrale',
      status: ExaminationStatus.SCHEDULED,
      priority: Priority.HIGH,
      patientId: createdPatients[1].id,
      assignedToId: radiologist1.id,
      referrerId: referrer1.id,
      createdById: secretary.id,
      clinicalInfo: 'Céphalées persistantes depuis 3 semaines.',
      contrast: true,
    },
    {
      scheduledDate: new Date(Date.now() - 30 * 60 * 1000), // -30 minutes (in progress)
      modality: Modality.US,
      examType: 'Échographie abdominale',
      bodyPart: 'Abdomen',
      procedure: 'Echographie abdominale',
      status: ExaminationStatus.IN_PROGRESS,
      priority: Priority.NORMAL,
      patientId: createdPatients[2].id,
      assignedToId: radiologist2.id,
      referrerId: referrer1.id,
      createdById: technician.id,
      clinicalInfo: 'Douleurs abdominales. Bilan hépatique perturbé.',
      accessionTime: new Date(Date.now() - 30 * 60 * 1000),
      contrast: false,
    },
    {
      scheduledDate: new Date(Date.now() - 2 * 60 * 60 * 1000), // -2 hours (acquired)
      modality: Modality.DX,
      examType: 'Radiographie thorax',
      bodyPart: 'Thorax',
      procedure: 'Radiographie thoracique face/profil',
      status: ExaminationStatus.ACQUIRED,
      priority: Priority.URGENT,
      patientId: createdPatients[3].id,
      assignedToId: radiologist1.id,
      referrerId: referrer1.id,
      createdById: technician.id,
      clinicalInfo: 'Dyspnée aiguë. Suspicion pneumopathie.',
      accessionTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
      acquisitionTime: new Date(Date.now() - 90 * 60 * 1000),
      imagesAvailable: true,
      contrast: false,
    },
    {
      scheduledDate: new Date(Date.now() - 4 * 60 * 60 * 1000), // -4 hours (reporting)
      modality: Modality.CT,
      examType: 'Scanner abdomino-pelvien',
      bodyPart: 'Abdomen-Pelvis',
      procedure: 'Scanner abdomino-pelvien avec injection',
      status: ExaminationStatus.REPORTING,
      priority: Priority.NORMAL,
      patientId: createdPatients[4].id,
      assignedToId: radiologist2.id,
      referrerId: referrer1.id,
      createdById: technician.id,
      clinicalInfo: 'Bilan d\'extension. Néoplasie colique connue.',
      accessionTime: new Date(Date.now() - 4 * 60 * 60 * 1000),
      acquisitionTime: new Date(Date.now() - 3 * 60 * 60 * 1000),
      imagesAvailable: true,
      contrast: true,
    },
    // Yesterday's examinations
    {
      scheduledDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      modality: Modality.MG,
      examType: 'Mammographie bilatérale',
      bodyPart: 'Seins',
      procedure: 'Mammographie de dépistage',
      status: ExaminationStatus.VALIDATED,
      priority: Priority.NORMAL,
      patientId: createdPatients[1].id,
      assignedToId: radiologist1.id,
      referrerId: referrer1.id,
      createdById: secretary.id,
      clinicalInfo: 'Dépistage systématique.',
      accessionTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
      acquisitionTime: new Date(Date.now() - 23 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 22 * 60 * 60 * 1000),
      imagesAvailable: true,
      contrast: false,
    },
    // Emergency case
    {
      scheduledDate: new Date(),
      modality: Modality.CT,
      examType: 'Scanner cérébral',
      bodyPart: 'Crâne',
      procedure: 'Scanner cérébral sans injection',
      status: ExaminationStatus.EMERGENCY,
      priority: Priority.EMERGENCY,
      patientId: createdPatients[0].id,
      assignedToId: radiologist1.id,
      referrerId: referrer1.id,
      createdById: technician.id,
      clinicalInfo: 'URGENCE - Traumatisme crânien. Glasgow 12.',
      contrast: false,
      comments: ['URGENCE VITALE', 'Prévenir immédiatement le radiologue de garde'],
    },
  ];

  const createdExaminations = [];
  for (let i = 0; i < examinations.length; i++) {
    const examData = examinations[i];
    const accessionNumber = await generateAccessionNumber(i + 1);
    
    const examination = await prisma.examination.create({
      data: {
        ...examData,
        accessionNumber,
        studyInstanceUID: examData.imagesAvailable ? `1.2.826.0.1.3680043.2.1143.${Date.now()}.${i + 1}` : undefined,
      },
    });
    createdExaminations.push(examination);
  }

  console.log('✅ Examinations created');

  // Create Reports for completed examinations
  console.log('📄 Creating reports...');

  const validatedExam = createdExaminations.find(e => e.status === ExaminationStatus.VALIDATED);
  const reportingExam = createdExaminations.find(e => e.status === ExaminationStatus.REPORTING);

  if (validatedExam) {
    await prisma.report.create({
      data: {
        status: ReportStatus.FINAL,
        indication: 'Dépistage systématique mammographique.',
        technique: 'Mammographie bilatérale en incidences face et oblique.',
        findings: 'Seins de densité mixte ACR B.\n\nSein droit:\n- Parenchyme d\'aspect normal\n- Pas de masse suspecte\n- Pas de microcalcifications suspectes\n\nSein gauche:\n- Parenchyme d\'aspect normal\n- Pas de masse suspecte\n- Pas de microcalcifications suspectes\n\nAires ganglionnaires axillaires libres.',
        impression: 'MAMMOGRAPHIE NORMALE\n\nACR 1 - Mammographie normale\n\nProchain contrôle dans 2 ans.',
        ccamCodes: ['QEQK002'],
        examinationId: validatedExam.id,
        createdById: radiologist1.id,
        validatedById: radiologist1.id,
        draftedAt: new Date(Date.now() - 23 * 60 * 60 * 1000),
        validatedAt: new Date(Date.now() - 22 * 60 * 60 * 1000),
      },
    });
  }

  if (reportingExam) {
    await prisma.report.create({
      data: {
        status: ReportStatus.DRAFT,
        indication: 'Bilan d\'extension. Néoplasie colique connue.',
        technique: 'Scanner abdomino-pelvien avec injection de produit de contraste iodé.',
        findings: 'En cours de rédaction...',
        impression: '[En cours]',
        examinationId: reportingExam.id,
        createdById: radiologist2.id,
        draftedAt: new Date(Date.now() - 30 * 60 * 1000),
      },
    });
  }

  console.log('✅ Reports created');
  console.log('🎉 Database seeding completed successfully!');

  // Display summary
  const userCount = await prisma.user.count();
  const patientCount = await prisma.patient.count();
  const examinationCount = await prisma.examination.count();
  const reportCount = await prisma.report.count();
  const templateCount = await prisma.reportTemplate.count();

  console.log('\n📊 Database Summary:');
  console.log(`👥 Users: ${userCount}`);
  console.log(`👤 Patients: ${patientCount}`);
  console.log(`🏥 Examinations: ${examinationCount}`);
  console.log(`📄 Reports: ${reportCount}`);
  console.log(`📋 Report Templates: ${templateCount}`);

  console.log('\n🔐 Default login credentials:');
  console.log('Admin: admin@radris.fr / admin123');
  console.log('Radiologist: dr.martin@radris.fr / admin123');
  console.log('Technician: tech.bernard@radris.fr / admin123');
}

// Helper function to generate accession numbers
async function generateAccessionNumber(counter: number): Promise<string> {
  const prefix = new Date().getFullYear().toString().slice(-2);
  const date = new Date().toISOString().slice(5, 10).replace('-', '');
  const counterStr = counter.toString().padStart(4, '0');
  return `${prefix}${date}${counterStr}`;
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });