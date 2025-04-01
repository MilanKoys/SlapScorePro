import { Routes } from '@angular/router';
import { CreateLobbyComponent } from './create-lobby/create-lobby.component';
import { JoinLobbyComponent } from './join-lobby/join-lobby.component';
import { LobbyComponent } from './lobby/lobby.component';

export const routes: Routes = [
  {
    path: 'lobby/create',
    component: CreateLobbyComponent,
  },
  {
    path: 'lobby/join/:id',
    component: JoinLobbyComponent,
  },
  {
    path: 'lobby/:id',
    component: LobbyComponent,
  },
];
