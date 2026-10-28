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
} as const
