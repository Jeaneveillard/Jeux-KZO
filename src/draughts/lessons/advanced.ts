import type { Lesson } from '../../lessons/types';

const FAR_PAWN = 'Ce pion est encore loin. Avance plutôt celui qui peut devenir dame tout de suite !';
const NOT_FORCING = "Ce coup ne force rien. Cherche le pion à offrir : l'adversaire sera obligé de le prendre, et tu reprendras deux pions.";

export const ADVANCED_LESSONS: readonly Lesson[] = [
  {
    id: 'prise-maximale',
    title: 'La règle de la prise maximale',
    intro: [
      'Quand plusieurs prises sont possibles, tu dois choisir celle qui prend le plus de pièces. Un pion et une dame comptent pareil.',
      'Si deux prises prennent autant de pièces, tu choisis celle que tu préfères.',
    ],
    exercises: [
      {
        kind: 'find-move',
        position: 'W:W32,36:B28,19,31',
        instruction: "Un de tes pions peut prendre un pion noir, l'autre peut en prendre deux. La règle t'oblige à prendre le plus : joue la rafle.",
        solutions: ['32x23x14'],
      },
      {
        kind: 'find-move',
        position: 'W:W32,33:B28',
        instruction: "Deux prises d'un seul pion sont possibles : à égalité, tu choisis. Prends le pion noir.",
        solutions: ['32x23', '33x22'],
      },
    ],
  },
  {
    id: 'promotion',
    title: 'La promotion',
    intro: [
      'Quand ton pion termine son coup sur la dernière rangée, tout en haut, il devient une dame : une couronne apparaît sur lui.',
      "Attention : s'il ne fait que passer par la dernière rangée pendant une rafle, il reste un pion.",
    ],
    exercises: [
      {
        kind: 'find-move',
        position: 'W:W9,33:B45',
        instruction: 'Un de tes pions peut devenir dame en un seul coup. Lequel ? Joue-le.',
        solutions: ['9-3', '9-4'],
        wrongMoveHints: { '33-28': FAR_PAWN, '33-29': FAR_PAWN },
      },
      {
        kind: 'find-move',
        position: 'W:W13:B9,10',
        instruction: "Joue la rafle obligatoire : ton pion passe par la dernière rangée mais n'y termine pas, il reste pion.",
        solutions: ['13x4x15'],
      },
      {
        kind: 'play-out',
        position: 'W:W12:B36',
        instruction: "Mène ton pion jusqu'à la dernière rangée pour en faire une dame. L'ordinateur joue les Noirs.",
        goal: 'promote',
        level: 'faible',
      },
    ],
  },
  {
    id: 'dame-volante',
    title: 'La dame volante',
    intro: [
      "La dame se déplace en diagonale, en avant comme en arrière, d'autant de cases qu'elle veut, tant que le chemin est libre.",
      "C'est la pièce la plus forte : elle vaut environ trois pions.",
    ],
    exercises: [
      {
        kind: 'collect',
        position: 'W:WK46:B',
        instruction: 'Ramasse les étoiles avec ta dame. Elle peut traverser tout le damier en un seul coup !',
        stars: ['5', '45', '1'],
      },
    ],
  },
  {
    id: 'prise-dame',
    title: 'La prise par la dame',
    intro: [
      'La dame prend à distance : elle peut sauter une pièce adverse éloignée sur sa diagonale, si les cases entre elles sont libres.',
      "Après la prise, elle s'arrête sur la case libre de son choix derrière la pièce prise, sauf si une de ces cases lui permet de continuer : elle doit alors prendre le plus de pièces possible.",
    ],
    exercises: [
      {
        kind: 'find-move',
        position: 'W:WK46:B28',
        instruction: "Prends le pion noir avec ta dame. Elle peut s'arrêter sur n'importe quelle case libre après lui.",
        solutions: ['46x23', '46x19', '46x14', '46x10', '46x5'],
      },
      {
        kind: 'find-move',
        position: 'W:WK46:B28,13',
        instruction: "Cette fois, choisis la case d'arrivée qui permet à ta dame de prendre aussi le deuxième pion.",
        solutions: ['46x19x8', '46x19x2'],
      },
    ],
  },
  {
    id: 'nulle',
    title: 'La partie nulle',
    intro: [
      'Une partie est nulle (personne ne gagne) si la même position revient trois fois, ou si pendant 25 coups chaque joueur ne bouge que des dames, sans prise.',
      "Avec très peu de pièces, la partie est aussi nulle au bout de quelques coups : par exemple, deux dames contre une doivent gagner en 5 coups, sinon c'est nulle.",
    ],
    exercises: [
      {
        kind: 'mate-in-1',
        position: 'W:WK46,K3:BK28',
        instruction: 'Tu as deux dames contre une : ne laisse pas filer la victoire. Gagne en un coup en prenant la dame noire !',
      },
    ],
  },
  {
    id: 'tactique',
    title: 'Premiers coups tactiques',
    intro: [
      "Comme la prise est obligatoire, tu peux forcer l'adversaire à prendre : c'est la base des combinaisons.",
      "L'idée : offrir un pion pour que l'adversaire, obligé de le prendre, place sa pièce là où tu pourras en prendre deux.",
    ],
    exercises: [
      {
        kind: 'find-move',
        position: 'W:W32,33,38,43:B22,23',
        instruction: 'Offre un pion : le pion noir sera obligé de le prendre, puis tu en prendras deux.',
        solutions: ['32-28'],
        wrongMoveHints: { '32-27': NOT_FORCING, '33-29': NOT_FORCING },
      },
      {
        kind: 'find-move',
        position: 'W:W33,38,43:B22,32',
        instruction: 'Le pion noir vient de prendre ton pion. À toi de jouer la rafle qui prend deux pions !',
        solutions: ['38x27x18'],
      },
    ],
  },
];
