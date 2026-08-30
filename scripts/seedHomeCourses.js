require('dotenv').config();

const Course = require('../models/Course');
const Trainer = require('../models/Trainer');

const trainers = [
  {
    id: 'trainer_accelerator_123',
    slug: 'trainer_accelerator_123',
    name: 'Ashish Goel',
    title: 'Senior Data Analytics, MIS & Power BI Trainer (India | UAE | US)',
    avatar: '/instructor/ashish.jpeg',
    rating: 4.9,
    students: '1000+',
    experience: '8+ Years',
    bio: 'Ashish Goel is a corporate data analytics professional and international trainer with over 8 years of experience in Power BI, Advanced Excel, MIS, SQL, and Accounting Analytics. He has trained students, professionals, and corporate teams across India, UAE, and the US, combining real corporate reporting exposure with hands-on, job-ready training.',
    qualifications: [
      'MBA – Finance & Banking, NMIMS',
      'B.Com (Hons), University of Delhi'
    ],
    expertise: [
      'Power BI (DAX, Data Modelling, Dashboards)',
      'Advanced Excel (MIS, Automation, Power Query)',
      'SQL & Reporting Automation',
      'Accounting & ERP (Tally, SAP – Finance)',
      'Business Analytics & MIS Reporting'
    ],
    experienceDetails: [
      'Data Analyst – Global Reporting | Allianz (Current)',
      'Business Analyst | AXA XL',
      'Business Analyst | Capco',
      'Data Analyst | Accenture',
      'Worked on global MIS dashboards, reporting automation, compliance tracking, and analytics transformation projects'
    ],
    certifications: [
      'Power BI Certified Professional',
      'Advanced Excel & MIS Certification',
      'Corporate Data Analytics Specialist'
    ],
    projects: [
      'Designed job-ready analytics programs for colleges & institutes',
      'Conducted corporate workshops reducing manual reporting by 60–70%',
      'Delivered 700+ live training sessions globally',
      'Created real dashboard case studies for interview preparation'
    ],
    vision: 'This program is not about tools. It is about preparing students for real office roles, real expectations, and real interviews.',
    email: 'ashish.goel@kaushalhub.com',
    isActive: true
  },
  {
    id: 'trainer_us_it_recruitment_101',
    slug: 'trainer_us_it_recruitment_101',
    name: 'Shams Siddiqui',
    title: 'Senior Talent Acquisition Leader | US IT Recruitment Trainer | Global Hiring Specialist',
    avatar: '/instructor/usitrec.jpeg',
    rating: 4.9,
    students: '1000+',
    experience: '10+ Years',
    bio: 'Shams Siddiqui is a seasoned Talent Acquisition & L&D Leader with over a decade of experience in building high-performance recruitment teams across global markets. He has led hiring operations for international clients and specializes in US IT Recruitment, sourcing strategy, and recruitment process optimization. He combines real corporate hiring exposure with practical, job-ready training designed for students and professionals entering the global recruitment industry.',
    qualifications: [
      'Talent Acquisition & L&D Leader – Global Markets',
      'Leadership roles in multinational hiring environments'
    ],
    expertise: [
      'US IT Recruitment Process',
      'LinkedIn & Boolean Search Mastery',
      'Resume Screening & Candidate Sourcing',
      'ATS Handling & Interview Coordination',
      'Client Communication & Stakeholder Management',
      'Recruitment Analytics & Performance Metrics'
    ],
    experienceDetails: [
      'Managed US IT hiring lifecycle end-to-end',
      'Built recruitment teams & performance frameworks',
      'Delivered hiring strategy for global technology clients'
    ],
    certifications: [
      'Designed job-ready recruitment programs',
      'Trained aspiring US IT Recruiters & Talent Acquisition Executives',
      'Conducted corporate workshops on hiring excellence'
    ],
    projects: [
      'Expertise in global recruitment strategy',
      'Trained 1000+ professionals for US IT recruitment roles'
    ],
    vision: 'This program is not about theory. It is about preparing students for real hiring floors, real client expectations, and real performance targets.',
    email: 'shams.siddiqui@kaushalhub.com',
    isActive: true
  },
  {
    id: 'trainer_industrial_career_001',
    slug: 'trainer_industrial_career_001',
    name: 'Niraj Kumar',
    title: 'Industrial Automation, Manufacturing & Technical Skills Trainer',
    avatar: '/instructor/niraj.jpeg',
    rating: 4.8,
    students: '500+',
    experience: '10+ Years',
    bio: 'Mr. Niraj Kumar is an experienced Industrial Automation and Technical Skills Trainer with more than 10 years of experience in technical education, industrial automation training, and project-based learning. He specializes in transforming technical concepts into practical industry applications, enabling ITI, Diploma, and Engineering students to develop job-ready skills aligned with modern manufacturing and automation environments. His training approach combines industrial exposure, hands-on learning, problem-solving, and workplace readiness to help students successfully transition from classrooms to careers.',
    qualifications: [
      'Bachelor of Science (Physics)',
      'Master of Science (Electronics)',
      'Master of Technology (Nanoscience & Nanotechnology)'
    ],
    expertise: [
      'PLC Programming & Industrial Control Systems',
      'Siemens PLC (S7-200, S7-300, S7-400, S7-1200, S7-1500)',
      'Allen Bradley PLC Platforms',
      'FESTO Automation Systems',
      'Ladder Logic Programming',
      'Functional Block Diagram (FBD)',
      'Sequential Function Chart (SFC)',
      'HMI Configuration & Industrial Interfaces',
      'Sensors, Actuators & Control Devices',
      'Industry 4.0 Awareness'
    ],
    experienceDetails: [
      'Industrial Automation & Technical Skills Trainer – KaushalHub',
      '10+ Years in Technical Education & Industrial Training',
      'Trained 500+ students across Diploma, Engineering & Technical Education programs',
      'Specialized in PLC Programming, Automation Systems & Manufacturing Operations'
    ],
    certifications: [
      'Delivered practical learning sessions focused on manufacturing, automation and industrial operations',
      'Mentored students in career planning, interview readiness and workplace expectations',
      'Guided learners on resume development, LinkedIn optimization and technical career pathways',
      'Conducted project-based workshops to improve practical problem-solving skills'
    ],
    projects: [
      'Door Automation System',
      'Traffic Signal Control System',
      'Industrial I/O Simulation Module',
      'Automated Car Parking System',
      'Conveyor & Motor Control Applications',
      'PLC-Based Industrial Control Projects'
    ],
    vision: 'My goal is to bridge the gap between technical education and industrial employment by equipping students with practical skills, professional confidence, and industry exposure that make them productive and employable from day one.',
    email: 'niraj.kumar@kaushalhub.com',
    isActive: true
  }
];

const courses = [
  {
    id: 'career-accelerator',
    slug: 'career-accelerator',
    title: 'Career Accelerator Program',
    description: 'Accounting • Compliance • Analytics • MIS | From Fresher to Office-Ready Professional. Live classes with expert mentors and hands-on projects.',
    shortDescription: 'Office-ready accounting and analytics training for freshers and career switchers.',
    image: '/images/courses/cap.jpeg',
    duration: '3 Months',
    level: 'Advanced',
    category: 'Accounting',
    originalPrice: 49999,
    discountedPrice: 30000,
    discountPercent: 40,
    savings: 19999,
    price: 30000,
    rating: 4.8,
    students: '500+',
    reviews: '387',
    outcomes: [
      'Account Executive',
      'Compliance Officer',
      'MIS Executive',
      'Business Analyst',
      'Finance Associate'
    ],
    trainerId: 'trainer_accelerator_123',
    featured: true,
    status: 'active',
    curriculum: [
      { id: 'module-1', title: 'Foundation in Accounts & Finance', classes: [
        { id: '1-1', title: 'Introduction to Accounting Fundamentals', type: 'video' },
        { id: '1-2', title: 'Journal, Ledger & Trial Balance', type: 'video' },
        { id: '1-3', title: 'Excel for Finance & MIS', type: 'video' }
      ] },
      { id: 'module-2', title: 'Excel & MIS Automation', classes: [
        { id: '2-1', title: 'Advanced Excel Functions', type: 'video' },
        { id: '2-2', title: 'Dashboard Creation', type: 'project' },
        { id: '2-3', title: 'Power Query & Data Cleaning', type: 'video' }
      ] },
      { id: 'module-3', title: 'Power BI & Reporting', classes: [
        { id: '3-1', title: 'Data Modelling in Power BI', type: 'video' },
        { id: '3-2', title: 'DAX Formula Fundamentals', type: 'video' },
        { id: '3-3', title: 'Executive Dashboard Design', type: 'project' }
      ] },
      { id: 'module-4', title: 'Tally & ERP Basics', classes: [
        { id: '4-1', title: 'Accounting Entries in Tally', type: 'video' },
        { id: '4-2', title: 'GST & Tax Compliance', type: 'video' },
        { id: '4-3', title: 'Inventory & Purchase Cycle', type: 'text' }
      ] },
      { id: 'module-5', title: 'Corporate Communication', classes: [
        { id: '5-1', title: 'Business Email Writing', type: 'video' },
        { id: '5-2', title: 'Client Communication Skills', type: 'video' },
        { id: '5-3', title: 'Presentation Skills', type: 'video' }
      ] },
      { id: 'module-6', title: 'Capstone Project & Career Prep', classes: [
        { id: '6-1', title: 'Complete Business Case Study', type: 'project' },
        { id: '6-2', title: 'Resume Building for Corporate Roles', type: 'text' },
        { id: '6-3', title: 'Mock Interview Preparation', type: 'video' }
      ] }
    ]
  },
  {
    id: 'us-it-recruitment',
    slug: 'us-it-recruitment',
    title: 'U.S. IT Recruitment Job Ready Program',
    description: 'Become a US IT Recruiter in just 1 month. Learn Dice/Monster, Boolean search, ATS tools, visa terms, and calling skills with job guarantee support.',
    shortDescription: 'Learn US recruitment, sourcing, ATS operations, and candidate screening in a job-ready structure.',
    image: '/images/courses/us-it-recruitment.jpg',
    duration: '1 Month',
    level: 'Beginner to Advanced',
    category: 'Recruitment',
    originalPrice: 24999,
    discountedPrice: 15000,
    discountPercent: 40,
    savings: 9999,
    price: 15000,
    rating: 4.9,
    students: '300+',
    reviews: '128',
    outcomes: [
      'US IT Recruiter',
      'Talent Acquisition Specialist',
      'Staffing Specialist',
      'Sourcing Analyst',
      'Technical Recruiter'
    ],
    trainerId: 'trainer_us_it_recruitment_101',
    featured: true,
    status: 'active',
    curriculum: [
      { id: 'module-1', title: 'U.S. Recruitment Fundamentals', classes: [
        { id: '1-1', title: 'Introduction to U.S. Staffing & Job Roles', type: 'video' },
        { id: '1-2', title: 'Recruitment Lifecycle (End-to-End Process)', type: 'video' },
        { id: '1-3', title: 'Understanding Job Descriptions (JD Analysis)', type: 'video' }
      ] },
      { id: 'module-2', title: 'Visa Types & Tax Terms', classes: [
        { id: '2-1', title: 'U.S. Visa Types (H1B, OPT, CPT, GC, TN, USC)', type: 'video' },
        { id: '2-2', title: 'Work Authorization Rules', type: 'video' },
        { id: '2-3', title: 'Tax Terms: W2, C2C, 1099', type: 'text' }
      ] },
      { id: 'module-3', title: 'Job Portals (Dice, Monster, CareerBuilder & Indeed)', classes: [
        { id: '3-1', title: 'Dice: Resume Searching, Filters, Saved Searches', type: 'video' },
        { id: '3-2', title: 'Monster: Backup Search Strategies', type: 'video' },
        { id: '3-3', title: 'CareerBuilder: Candidate Sourcing', type: 'video' }
      ] },
      { id: 'module-4', title: 'Boolean Search Mastery', classes: [
        { id: '4-1', title: 'AND / OR / NOT / "" / () Operators', type: 'video' },
        { id: '4-2', title: 'Writing Boolean Strings from JD', type: 'video' },
        { id: '4-3', title: '20+ Boolean Practice Examples', type: 'project' }
      ] },
      { id: 'module-5', title: 'Candidate Screening & Communication Skills', classes: [
        { id: '5-1', title: 'Screening Call Script & Questions', type: 'video' },
        { id: '5-2', title: 'Checking Technical Skills (Simple Method)', type: 'video' },
        { id: '5-3', title: 'Visa & Rate Verification', type: 'text' }
      ] },
      { id: 'module-6', title: 'ATS (Ceipal / Bullhorn / Zoho Recruit)', classes: [
        { id: '6-1', title: 'Adding Candidates', type: 'video' },
        { id: '6-2', title: 'Resume Uploading & Status Update', type: 'video' },
        { id: '6-3', title: 'Submission Workflow', type: 'text' }
      ] },
      { id: 'module-7', title: 'Real-Time Work Training + Mock Interviews', classes: [
        { id: '7-1', title: 'Live JD Practice', type: 'project' },
        { id: '7-2', title: 'Searching Candidates & Screening Practice', type: 'project' },
        { id: '7-3', title: 'Negotiation Skills (How to Ask Rate)', type: 'video' }
      ] }
    ]
  },
  {
    id: 'industrial-career-program',
    slug: 'industrial-career-program',
    title: 'Industrial Career Program (For ITI & Diploma)',
    description: '5 Modules • 10 Sessions • 20 Hours Live Training. Launch your career in India\'s Manufacturing & Industrial Sector with 100% placement assistance and industrial visit exposure.',
    shortDescription: 'Technical and workplace-readiness training for manufacturing and industrial careers.',
    image: '/images/courses/icp.jpeg',
    duration: '1 Month',
    level: 'Beginner',
    category: 'Manufacturing',
    originalPrice: 24999,
    discountedPrice: 15000,
    discountPercent: 40,
    savings: 9999,
    price: 15000,
    rating: 4.7,
    students: '200+',
    reviews: '156',
    outcomes: [
      'CNC Operator',
      'Production Associate',
      'Quality Inspector',
      'Maintenance Technician',
      'Machine Operator'
    ],
    trainerId: 'trainer_industrial_career_001',
    featured: true,
    status: 'active',
    curriculum: [
      { id: 'module-1', title: 'Industry Orientation & Career Mapping', classes: [
        { id: '1-1', title: 'Manufacturing Industry Overview', type: 'video' },
        { id: '1-2', title: 'Career Opportunities for ITI & Diploma Students', type: 'video' },
        { id: '1-3', title: 'Career Growth Path (Trainee → Technician → Supervisor)', type: 'text' }
      ] },
      { id: 'module-2', title: 'Workplace Readiness & Communication', classes: [
        { id: '2-1', title: 'Professional Communication Skills', type: 'video' },
        { id: '2-2', title: 'Workplace Discipline & Behaviour', type: 'video' },
        { id: '2-3', title: 'Teamwork & Productivity', type: 'text' }
      ] },
      { id: 'module-3', title: 'Manufacturing & Production Fundamentals', classes: [
        { id: '3-1', title: 'Production Processes', type: 'video' },
        { id: '3-2', title: 'Shop Floor Operations', type: 'video' },
        { id: '3-3', title: 'Manufacturing Workflow', type: 'text' }
      ] },
      { id: 'module-4', title: 'Quality, Maintenance & Industrial Safety', classes: [
        { id: '4-1', title: 'Quality Inspection Basics', type: 'video' },
        { id: '4-2', title: 'Defect Identification', type: 'video' },
        { id: '4-3', title: 'Preventive Maintenance Fundamentals', type: 'text' }
      ] },
      { id: 'module-5', title: 'Placement Readiness & Industry Exposure', classes: [
        { id: '5-1', title: 'Resume Building', type: 'text' },
        { id: '5-2', title: 'HR & Technical Interview Preparation', type: 'video' },
        { id: '5-3', title: 'Mock Interviews', type: 'project' }
      ] }
    ]
  }
];

(async () => {
  try {
    for (const trainer of trainers) {
      await Trainer.upsertById(trainer.id, trainer);
      console.log('✅ Trainer saved:', trainer.name, '->', trainer.id);
    }

    for (const course of courses) {
      await Course.upsertBySlug(course.slug, course);
      console.log('✅ Course saved:', course.title, '->', course.slug);
    }

    console.log('\n🎯 Course + trainer seeding complete.');
    console.log('Public endpoints ready:');
    console.log('  GET /api/courses/public');
    console.log('  GET /api/trainers/public');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to seed home courses:', error);
    process.exit(1);
  }
})();
