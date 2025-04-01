import { Component, inject, signal, WritableSignal } from '@angular/core';
import {
  ActivatedRoute,
  ActivatedRouteSnapshot,
  Router,
} from '@angular/router';
import { Nullable } from '../app.component';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-join-lobby',
  imports: [],
  templateUrl: './join-lobby.component.html',
  styleUrl: './join-lobby.component.scss',
})
export class JoinLobbyComponent {
  private readonly _route: ActivatedRoute = inject(ActivatedRoute);
  private readonly _router: Router = inject(Router);
  private readonly _lobbyIdentifier: WritableSignal<Nullable<string>> =
    signal(null);
  private readonly _httpClient: HttpClient = inject(HttpClient);

  constructor() {
    const lobbyId = this._route.snapshot.paramMap.get('id');
    this._lobbyIdentifier.set(lobbyId);
    this._httpClient
      .get(`http://localhost:4000/lobby/${lobbyId}/join`)
      .subscribe(() => {
        this._router.navigateByUrl(`/lobby/${lobbyId}`);
      });
  }
}
