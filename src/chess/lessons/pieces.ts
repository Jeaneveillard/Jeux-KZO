import type { Lesson } from '../../lessons/types';

export const PIECE_LESSONS: readonly Lesson[] = [
  {
    id: 'plateau',
    title: 'Le plateau et le but du jeu',
    intro: [
      "L'échiquier a 64 cases, claires et foncées. Chaque case a un nom : une lettre pour la colonne (de a à h) et un chiffre pour la rangée (de 1 à 8).",
      'Les Blancs jouent toujours en premier, puis chacun joue à son tour, un coup à la fois.',
      "Le but du jeu : faire « échec et mat », c'est-à-dire attaquer le roi adverse sans qu'il puisse s'échapper.",
    ],
    exercises: [
      {
        kind: 'reach',
        position: '8/8/8/8/8/8/8/4R3 w - - 0 1',
        instruction: "Pour jouer, touche une pièce puis la case où tu veux l'amener. Amène la tour sur l'étoile, en e8.",
        target: 'e8',
      },
    ],
  },
  {
    id: 'tour',
    title: 'La tour',
    intro: [
      "La tour se déplace en ligne droite : vers le haut, le bas, la gauche ou la droite, d'autant de cases qu'elle veut.",
      'Elle ne peut pas sauter par-dessus une autre pièce.',
    ],
    exercises: [
      { kind: 'collect', position: '8/8/8/8/8/8/8/R7 w - - 0 1', instruction: 'Ramasse toutes les étoiles avec la tour.', stars: ['a5', 'e5', 'e8'] },
      {
        kind: 'collect',
        position: '8/8/8/8/3P4/8/8/3R4 w - - 0 1',
        instruction: "Ton pion bloque le chemin : contourne-le avec la tour pour atteindre l'étoile.",
        stars: ['d6'],
      },
    ],
  },
  {
    id: 'fou',
    title: 'Le fou',
    intro: ["Le fou se déplace en diagonale, d'autant de cases qu'il veut.", 'Il reste toujours sur des cases de la même couleur.'],
    exercises: [
      { kind: 'collect', position: '8/8/8/8/8/8/8/2B5 w - - 0 1', instruction: 'Ramasse toutes les étoiles avec le fou.', stars: ['e3', 'h6', 'f8'] },
    ],
  },
  {
    id: 'dame',
    title: 'La dame',
    intro: [
      'La dame est la pièce la plus puissante : elle se déplace comme la tour ET comme le fou.',
      "En ligne droite ou en diagonale, d'autant de cases qu'elle veut.",
    ],
    exercises: [
      { kind: 'collect', position: '8/8/8/8/8/8/8/3Q4 w - - 0 1', instruction: 'Ramasse toutes les étoiles avec la dame.', stars: ['d5', 'h1', 'a8'] },
    ],
  },
  {
    id: 'roi',
    title: 'Le roi',
    intro: [
      "Le roi se déplace d'une seule case, dans n'importe quelle direction.",
      "C'est la pièce la plus importante : s'il est mis échec et mat, la partie est perdue. Il ne peut jamais aller sur une case attaquée.",
    ],
    exercises: [
      { kind: 'collect', position: '8/8/8/8/8/8/8/4K3 w - - 0 1', instruction: 'Ramasse les étoiles avec le roi, une case à la fois.', stars: ['e3', 'f4', 'd5'] },
    ],
  },
  {
    id: 'cavalier',
    title: 'Le cavalier',
    intro: [
      'Le cavalier se déplace en « L » : deux cases tout droit, puis une case sur le côté.',
      "C'est la seule pièce qui peut sauter par-dessus les autres.",
    ],
    exercises: [
      { kind: 'collect', position: '8/8/8/8/8/8/8/1N6 w - - 0 1', instruction: 'Ramasse toutes les étoiles avec le cavalier.', stars: ['c3', 'd5', 'f6'] },
      {
        kind: 'reach',
        position: '8/8/8/8/PPP5/PNP5/PPP5/8 w - - 0 1',
        instruction: "Ton cavalier est entouré de pions : saute par-dessus pour atteindre l'étoile.",
        target: 'd4',
      },
    ],
  },
  {
    id: 'pion',
    title: 'Le pion',
    intro: [
      'Le pion avance tout droit, une case à la fois. À son tout premier coup, il peut avancer de deux cases.',
      'Il ne recule jamais. Pour prendre, il avance d’une case en diagonale.',
    ],
    exercises: [
      {
        kind: 'collect',
        position: '8/8/8/8/8/8/4P3/8 w - - 0 1',
        instruction: "Avance le pion jusqu'aux étoiles. Au premier coup, il peut faire deux pas !",
        stars: ['e4', 'e5'],
      },
      {
        kind: 'find-move',
        position: '8/8/8/8/3p4/4P3/8/8 w - - 0 1',
        instruction: 'Le pion prend en diagonale : prends le pion noir.',
        solutions: ['e3d4'],
        wrongMoveHints: { e3e4: 'Le pion ne prend jamais tout droit : il prend en diagonale.' },
      },
    ],
  },
];
