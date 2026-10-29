/**
 * Весь читаемый текст сцены — править здесь.
 * Потом: украинская локаль, оверлеи якорей, КПК и т.д.
 */
export const stashCopy = {
  role: 'Front-End Engineer',
  name: 'Khorunzhyi Yevhen',
  description: {
    name: 'My name is Eugene Horunzhyi',
    job: 'JS Developer',
    details: 'I am JS/TS (React, Vue, Three.js, Pixi) developer from Ukraine, specializing in creating web interfaces and applications. I am passionate about creating software that will improve the lives of people around me.',
    about: {
      experience: '4+ years of experience',
      projects: '12+ commercial projects',
    },
    experience: {
      title: 'experience',
      data: [
        'FIVE',
        'DevOcean',
        'Frozeneon',
      ],
    },
    education: {
      title: 'Education',
      vpnu: {
        institution: 'vpnu iede',
        specialization: 'bachelor',
        description: 'Bachelor degree from Vinnitsa Polytechnic National University, Institute of Electric Drive and Electromechanics.'
      },
      siemens: {
        institution: 'siemens',
        specialization: 'siemens-programmer',
        description: '6 courses of study. Siemens Programer Stage 2.'
      },
      itvdn: {
        institution: 'itvdn',
        specialization: 'front-end developer',
        description: '6-month Front-End Developer course.'
      },
      glo: {
        institution: 'glo-academy',
        specialization: 'js-developer',
        description: '4-month JS-Developer course. First place by the results of the training. Third place in the project competition.'
      },
      jm: {
        institution: 'jm',
        specialization: 'js-developer',
        description: '6-month JS-Developer course.'
      },
      incubator: {
        institution: 'it-incubator',
        specialization: 'js(react)-developer',
        description: '8-month JS(React)-Developer course.'
      }
    },
  },
  form: {
    title: 'Feel free to contact me.',
    subtitle: 'I am always open to discuss new projects, creative ideas or opportunity become a part of your vision.',
    email: {
      name: 'Your name',
      mail: 'Your email',
      subject: 'Your subject',
      msg: 'Your message',
      send: 'Send',
      icon: '/public/icons/plane.svg',
    },
    phone: {
      title: 'Call me',
      number: '+3 8063 882 80 81',
      icon: '/public/icons/phone.svg',
    },
    cv: {
      text: 'Download CV',
      icon: '/public/icons/download.svg',
    },
    links: [
      {
        title: 'GitHub',
        link: 'https://github.com/ZHe-testName',
        icon: '/public/icons/git.svg',
      },
      {
        title: 'Linkedin',
        link: 'https://linkedin.com/in/евгений-хорунжий-10556b223',
        icon: '/public/icons/linkedin.svg',
      },
      {
        title: 'Facebook',
        link: 'https://www.facebook.com/horunzhy.wgen',
        icon: '/public/icons/fb.svg',
      },
    ],
    validation: {
      name: 'Name is required',
      email: 'Email is required',
      incorrectEmail: 'Incorrect e-mail address',
      subject: 'Subject is required',
      msg: 'Message is required',
      success: 'Successfully sended',
      error: 'Sending error', 
    },
  },
} as const
