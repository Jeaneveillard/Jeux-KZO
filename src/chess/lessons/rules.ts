import type { Lesson } from '../../lessons/types';

export const RULE_LESSONS: readonly Lesson[] = [
  {
    id: 'prises',
    title: 'Prendre, et la valeur des pièces',
    intro: [
      'Pour prendre une pièce adverse, on va sur sa case : elle est retirée du plateau.',
      'Les pièces n’ont pas toutes la même valeur : pion 1, cavalier 3, fou 3, tour 5, dame 9. Le roi ne peut jamais être pris.',
      'Quand tu as le choix, prends la pièce qui vaut le plus !',
    ],
    exercises: [
      { kind: 'collect', position: '8/1p4p1/8/8/8/8/1p6/1R6 w - - 0 1', instruction: 'Prends tous les pions noirs avec ta tour.', stars: ['b2', 'b7', 'g7'] },
      {
        kind: 'find-move',
        position: 'r3k3/8/8/8/8/8/1p6/Q3K3 w - - 0 1',
        instruction: 'Ta dame peut prendre deux pièces. Choisis la plus précieuse.',
        solutions: ['a1a8'],
        wrongMoveHints: { a1b2: 'Le pion ne vaut que 1 point. La tour vaut 5 : prends plutôt la tour !' },
      },
    ],
  },
  {
    id: 'echec',
    title: "L'échec et comment en sortir",
    intro: [
      "Quand le roi est attaqué, on dit qu'il est « en échec ». Il faut le sortir de l'échec tout de suite.",
      "Il y a trois façons : déplacer le roi (fuir), mettre une pièce entre le roi et l'attaquant (bloquer), ou prendre la pièce qui attaque.",
    ],
    exercises: [
      {
        kind: 'find-move',
        position: 'k7/8/8/8/8/8/8/r3K3 w - - 0 1',
        instruction: "Ton roi est en échec par la tour. Fuis : déplace le roi sur une case où il n'est plus attaqué.",
        solutions: ['e1d2', 'e1e2', 'e1f2'],
      },
      {
        kind: 'find-move',
        position: '7k/8/8/8/8/3B4/5PPP/r5K1 w - - 0 1',
        instruction: "Ton roi est en échec et ne peut pas bouger. Bloque l'attaque avec ton fou.",
        solutions: ['d3f1', 'd3b1'],
      },
      {
        kind: 'find-move',
        position: '6k1/8/8/4R3/8/8/5PPP/4r1K1 w - - 0 1',
        instruction: 'Ton roi est en échec. Prends la pièce qui attaque !',
        solutions: ['e5e1'],
      },
    ],
  },
  {
    id: 'mat',
    title: "L'échec et mat",
    intro: [
      "Si le roi est en échec et qu'aucune des trois défenses ne marche, c'est « échec et mat » : la partie est finie.",
      'À toi de donner le mat en un seul coup !',
    ],
    exercises: [
      { kind: 'mate-in-1', position: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', instruction: 'Le roi noir est coincé derrière ses pions. Fais échec et mat avec la tour.' },
      { kind: 'mate-in-1', position: 'k7/8/1K6/8/8/8/8/7Q w - - 0 1', instruction: 'Ta dame et ton roi travaillent ensemble. Fais échec et mat.' },
      { kind: 'mate-in-1', position: '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1', instruction: 'Le roi noir est entouré de ses propres pièces. Fais échec et mat avec le cavalier.' },
    ],
  },
  {
    id: 'pat',
    title: 'Le pat et la partie nulle',
    intro: [
      "Si le joueur qui doit jouer n'a AUCUN coup possible mais que son roi n'est pas en échec, c'est « pat » : la partie est nulle, personne ne gagne.",
      "D'autres parties sont nulles : quand la même position revient trois fois, ou quand il ne reste pas assez de pièces pour mater.",
      'Quand tu gagnes, attention au pat : laisse toujours une case au roi adverse avant de le mater !',
    ],
    exercises: [
      {
        kind: 'find-move',
        position: 'k7/8/1K6/8/8/8/8/2Q5 w - - 0 1',
        instruction: 'Fais échec et mat, mais attention au pat !',
        solutions: ['c1c8'],
        wrongMoveHints: { c1c7: "Pat ! Le roi noir n'est pas en échec mais ne peut plus bouger : ce serait nulle. Cherche le mat." },
      },
    ],
  },
  {
    id: 'roque',
    title: 'Le roque',
    intro: [
      'Le roque est un coup spécial : en un seul coup, tu mets ton roi à l’abri et tu sors ta tour.',
      'Le roi se déplace de deux cases vers une tour, et la tour saute de l’autre côté du roi. Pour roquer, touche ton roi puis la case à deux pas.',
      "Conditions : ni le roi ni la tour n'ont encore bougé, aucune pièce entre eux, et le roi n'est pas en échec et ne traverse pas une case attaquée.",
    ],
    exercises: [
      {
        kind: 'find-move',
        position: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',
        instruction: 'Fais le petit roque : touche ton roi, puis la case g1.',
        solutions: ['e1g1'],
        wrongMoveHints: { e1c1: "Ça, c'est le grand roque (côté dame). Ici, on veut le petit roque, du côté de la tour h1." },
      },
      {
        kind: 'find-move',
        position: 'r3k3/8/8/8/2b5/8/8/R3K2R w KQq - 0 1',
        instruction: 'Le fou noir attaque la case f1 : le petit roque est interdit. Fais le grand roque !',
        solutions: ['e1c1'],
      },
    ],
  },
  {
    id: 'promotion',
    title: 'La promotion',
    intro: [
      'Quand un pion arrive sur la dernière rangée, il se transforme : tu choisis une dame, une tour, un fou ou un cavalier.',
      'On choisit presque toujours la dame, la pièce la plus forte.',
    ],
    exercises: [
      {
        kind: 'find-move',
        position: '8/4P3/8/8/8/2k5/8/4K3 w - - 0 1',
        instruction: "Avance ton pion jusqu'au bout et transforme-le en la pièce la plus forte.",
        solutions: ['e7e8q'],
        wrongMoveHints: {
          e7e8r: "Une tour, c'est bien, mais une dame est encore plus forte !",
          e7e8b: "Un fou est moins fort qu'une dame. Choisis la dame !",
          e7e8n: "Un cavalier est moins fort qu'une dame. Choisis la dame !",
        },
      },
      {
        kind: 'play-out',
        position: '8/8/1P6/8/8/8/k7/4K3 w - - 0 1',
        instruction: "Mène ton pion jusqu'au bout pour faire une dame. Le roi noir va essayer de l'arrêter !",
        goal: 'promote',
        level: 'expert',
      },
    ],
  },
  {
    id: 'en-passant',
    title: 'La prise en passant',
    intro: [
      'La prise en passant est une règle spéciale des pions.',
      "Si un pion adverse avance de deux cases et s'arrête juste à côté de ton pion, tu peux le prendre comme s'il n'avait avancé que d'une case. Attention : seulement au coup qui suit !",
    ],
    exercises: [
      {
        kind: 'find-move',
        position: 'k7/8/8/3pP3/8/8/8/K7 w - d6 0 1',
        instruction: 'Le pion noir vient d’avancer de d7 à d5. Prends-le en passant !',
        solutions: ['e5d6'],
        wrongMoveHints: { e5e6: "Le pion noir vient d'avancer de deux cases à côté du tien : prends-le en passant, en allant en d6 !" },
      },
    ],
  },
];
