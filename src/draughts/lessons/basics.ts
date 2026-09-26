import type { Lesson } from '../../lessons/types';

export const BASIC_LESSONS: readonly Lesson[] = [
  {
    id: 'plateau',
    title: 'Le plateau et les cases foncées',
    intro: [
      'Le damier a 100 cases, mais on ne joue que sur les 50 cases foncées. Elles sont numérotées de 1 à 50 : tu vois le numéro dans le coin de chaque case.',
      'Chaque joueur a 20 pions. Les Blancs commencent, puis chacun joue à son tour.',
      "Pour gagner, il faut prendre toutes les pièces de l'adversaire, ou le bloquer pour qu'il ne puisse plus jouer.",
    ],
    exercises: [
      {
        kind: 'reach',
        position: 'W:W32:B',
        instruction: "Pour jouer, touche ton pion puis la case où tu veux l'amener. Amène-le sur l'étoile, en 28.",
        target: '28',
      },
    ],
  },
  {
    id: 'pion',
    title: 'Le déplacement du pion',
    intro: [
      "Le pion avance d'une seule case, en diagonale, toujours vers l'avant.",
      'Il ne recule jamais pour se déplacer, et il ne peut pas aller sur une case déjà occupée.',
    ],
    exercises: [
      { kind: 'collect', position: 'W:W46:B', instruction: 'Avance ton pion case après case pour ramasser les étoiles.', stars: ['37', '28'] },
      {
        kind: 'reach',
        position: 'W:W28,33:B',
        instruction: "Ton autre pion bloque un chemin : passe par l'autre diagonale pour atteindre l'étoile, en 24.",
        target: '24',
      },
    ],
  },
  {
    id: 'prise',
    title: 'La prise',
    intro: [
      "Quand un pion adverse est juste à côté du tien en diagonale et que la case derrière lui est libre, tu peux sauter par-dessus : il est pris et retiré du damier.",
      'Ton pion atterrit sur la case libre juste derrière la pièce prise.',
    ],
    exercises: [
      { kind: 'find-move', position: 'W:W32:B28', instruction: 'Saute par-dessus le pion noir pour le prendre.', solutions: ['32x23'] },
      {
        kind: 'find-move',
        position: 'W:W31,32,33:B27',
        instruction: 'Deux de tes pions peuvent prendre le pion noir. Prends-le !',
        solutions: ['31x22', '32x21'],
      },
    ],
  },
  {
    id: 'prise-obligatoire',
    title: 'La prise obligatoire',
    intro: [
      "Aux dames, prendre n'est pas un choix : si tu peux prendre une pièce, tu dois le faire.",
      "C'est pour ça que l'application ne te laisse pas bouger un autre pion quand une prise est possible.",
    ],
    exercises: [
      {
        kind: 'find-move',
        position: 'W:W33,46:B28',
        instruction: 'Tu voudrais peut-être avancer ton autre pion… mais une prise est possible. Joue le coup obligatoire.',
        solutions: ['33x22'],
      },
    ],
  },
  {
    id: 'prise-arriere',
    title: 'La prise en arrière',
    intro: [
      'Le pion ne recule jamais pour se déplacer, mais il peut prendre en arrière !',
      'Si un pion adverse est juste derrière le tien, en diagonale, avec une case libre derrière lui, tu peux (et tu dois) le prendre.',
    ],
    exercises: [
      { kind: 'find-move', position: 'W:W23:B28', instruction: 'Le pion noir est derrière ton pion. Prends-le en arrière.', solutions: ['23x32'] },
    ],
  },
  {
    id: 'rafles',
    title: 'Les rafles',
    intro: [
      "Après une prise, si ton pion peut encore sauter une autre pièce, il continue : c'est une rafle.",
      "Une rafle peut changer de direction, en avant comme en arrière. Les pièces prises ne sont retirées qu'à la fin.",
    ],
    exercises: [
      {
        kind: 'find-move',
        position: 'W:W32:B28,19',
        instruction: "Prends les deux pions noirs d'un seul coup : touche ton pion puis la case où il termine sa rafle.",
        solutions: ['32x23x14'],
      },
      {
        kind: 'find-move',
        position: 'W:W33:B28,18,19',
        instruction: 'Enchaîne trois prises, en avant puis en arrière. Où ton pion termine-t-il sa rafle ?',
        solutions: ['33x22x13x24'],
      },
    ],
  },
];
