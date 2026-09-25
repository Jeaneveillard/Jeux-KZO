import type { Lesson } from '../../lessons/types';
import { START_FEN } from '../adapter';

const OFF_CENTER = 'Les pions du bord ne contrôlent pas le centre. Joue un pion du milieu !';
const ONE_STEP = 'Pas mal, mais avance-le de deux cases pour mieux prendre le centre.';
const KNIGHT_ON_RIM = 'Un cavalier au bord du plateau contrôle peu de cases. Vise le centre !';

export const STRATEGY_LESSONS: readonly Lesson[] = [
  {
    id: 'ouverture',
    title: 'Bien commencer une partie',
    intro: [
      '1. Occupe le centre avec tes pions (les cases d4, e4, d5 et e5).',
      '2. Sors vite tes cavaliers et tes fous, vers le centre.',
      "3. Roque tôt pour mettre ton roi à l'abri, et ne sors pas ta dame trop tôt.",
    ],
    exercises: [
      {
        kind: 'find-move',
        position: START_FEN,
        instruction: 'Premier coup de la partie : avance un pion du centre de deux cases.',
        solutions: ['e2e4', 'd2d4'],
        wrongMoveHints: { e2e3: ONE_STEP, d2d3: ONE_STEP, a2a4: OFF_CENTER, h2h4: OFF_CENTER },
      },
      {
        kind: 'find-move',
        position: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
        instruction: 'Sors un cavalier vers le centre.',
        solutions: ['g1f3', 'b1c3'],
        wrongMoveHints: {
          d1h5: "Ne sors pas ta dame trop tôt : elle risque d'être attaquée.",
          g1h3: KNIGHT_ON_RIM,
          b1a3: KNIGHT_ON_RIM,
        },
      },
      {
        kind: 'find-move',
        position: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
        instruction: "Ton cavalier et ton fou sont sortis : mets ton roi à l'abri en roquant.",
        solutions: ['e1g1'],
      },
    ],
  },
  {
    id: 'tactiques',
    title: 'Les tactiques de base',
    intro: [
      "Une fourchette, c'est une pièce qui attaque deux pièces adverses en même temps : l'adversaire ne peut en sauver qu'une.",
      "Un clouage, c'est quand une pièce ne peut pas bouger sans laisser prendre une pièce plus importante derrière elle.",
    ],
    exercises: [
      {
        kind: 'find-move',
        position: 'r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1',
        instruction: 'Fourchette : trouve la case où ton cavalier attaque en même temps le roi et la tour.',
        solutions: ['b5c7'],
        wrongMoveHints: { b5d6: "Échec, mais ton cavalier n'attaque que le roi. Cherche la case où il attaque aussi la tour !" },
      },
      {
        kind: 'find-move',
        position: 'k7/8/8/n6n/8/8/2Q5/6K1 w - - 0 1',
        instruction: 'Attaque double : place ta dame pour qu’elle attaque les deux cavaliers en même temps.',
        solutions: ['c2c5', 'c2f5'],
      },
      {
        kind: 'find-move',
        position: '4k3/8/2n5/8/8/8/8/4KB2 w - - 0 1',
        instruction: 'Clouage : place ton fou pour que le cavalier ne puisse plus bouger sans exposer son roi.',
        solutions: ['f1b5'],
      },
    ],
  },
  {
    id: 'mats-de-base',
    title: 'Les mats de base',
    intro: [
      'Avec une dame (ou une tour) et ton roi, tu peux toujours mater un roi seul.',
      'La méthode : repousse le roi adverse vers un bord avec ta dame ou ta tour, sans le mettre pat, puis approche ton roi pour aider à donner le mat.',
    ],
    exercises: [
      {
        kind: 'play-out',
        position: '8/8/8/4k3/8/8/8/3QK3 w - - 0 1',
        instruction: "Roi et dame contre roi : fais échec et mat. L'ordinateur défend son roi du mieux possible.",
        goal: 'win',
        level: 'expert',
      },
      {
        kind: 'play-out',
        position: '8/8/8/4k3/8/8/8/R3K3 w - - 0 1',
        instruction: 'Roi et tour contre roi : fais échec et mat. Prends ton temps !',
        goal: 'win',
        level: 'expert',
      },
    ],
  },
];
