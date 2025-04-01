import { Arena } from './arena';
import { GameMode } from './game-mode';
import { Region } from './region';

export interface LobbyOptions {
  selfJoin: boolean;
  name: string;
  region: Region;
  password?: string;
  creator: string;
  arena: Arena;
  gameMode: GameMode;
  usePeriod: boolean;
  period?: number;
  teamSize: number;
  matchLength: number;
}

export interface Lobby {
  id: string;
  owner: string;
  created: number;
  members: string[];
  awayTeam: string[];
  homeTeam: string[];
  options: LobbyOptions;
}

export interface CreateLobby {
  name: string;
  region: Region;
  password?: string;
  creator: string;
  arena: Arena;
  gameMode: GameMode;
  usePeriod: boolean;
  period?: number;
  teamSize: number;
  matchLength: number;
}
