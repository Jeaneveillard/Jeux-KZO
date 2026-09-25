import type { Color, GameStatus, Level } from '../core/types';

export type Exercise =
  | { readonly kind: 'reach'; readonly position: string; readonly instruction: string; readonly target: string }
  | { readonly kind: 'collect'; readonly position: string; readonly instruction: string; readonly stars: readonly string[] }
  | {
      readonly kind: 'find-move';
      readonly position: string;
      readonly instruction: string;
      readonly solutions: readonly string[];
      readonly wrongMoveHints?: Readonly<Record<string, string>>;
    }
  | { readonly kind: 'mate-in-1'; readonly position: string; readonly instruction: string }
  | {
      readonly kind: 'play-out';
      readonly position: string;
      readonly instruction: string;
      readonly goal: 'win' | 'promote';
      readonly level: Level;
    };

export interface Lesson {
  readonly id: string;
  readonly title: string;
  /** 2 ou 3 phrases d'explication. */
  readonly intro: readonly string[];
  /** 1 à 3 exercices. */
  readonly exercises: readonly Exercise[];
}

/** Ce dont le moteur de leçons a besoin d'un jeu. */
export interface LessonRules<Pos, Move> {
  parse(position: string): Pos;
  legalMoves(pos: Pos): readonly Move[];
  play(pos: Pos, move: Move): Pos;
  /** Redonne le trait au joueur (exercices sans adversaire). */
  keepTurn(pos: Pos, color: Color): Pos;
  turn(pos: Pos): Color;
  status(pos: Pos): GameStatus;
  moveId(move: Move): string;
  destination(move: Move): string;
  isPromotion(move: Move): boolean;
}
