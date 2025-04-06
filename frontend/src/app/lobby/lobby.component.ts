import { HttpClient } from '@angular/common/http';
import {
  Component,
  computed,
  effect,
  inject,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Nullable } from '../app.component';
import { Lobby } from '../contracts';
import { environment } from '../../environments/environment';
import { WebsocketService } from '../websocket.service';

@Component({
  selector: 'app-lobby',
  imports: [],
  templateUrl: './lobby.component.html',
  styleUrl: './lobby.component.scss',
})
export class LobbyComponent {
  private readonly _websocketService: WebsocketService = inject(WebsocketService);
  private readonly _httpClient: HttpClient = inject(HttpClient);
  private readonly _route: ActivatedRoute = inject(ActivatedRoute);
  private readonly _lobby: WritableSignal<Nullable<Lobby>> = signal(null);
  private readonly _lobbyIdentifier: WritableSignal<Nullable<string>> =
    signal(null);
  protected readonly members: Signal<string[]> = computed(() => {
    const lobby: Nullable<Lobby> = this._lobby();
    if (!lobby) return [];
    return lobby.members.filter(
      (m) =>
        !lobby.awayTeam.find((a) => a === m) ||
        !lobby.homeTeam.find((h) => h === m)
    );
  });
  protected readonly lobby: Signal<Nullable<Lobby>> = this._lobby.asReadonly();
  protected readonly unassignedPlayers: Signal<string[]> = computed(() => {
    const lobby: Nullable<Lobby> = this.lobby();
    if (!lobby) return [];
    console.log(lobby.awayTeam, lobby.members)
    return lobby.members.filter(
      (m) =>
        !lobby.awayTeam.find((p) => p === m) &&
        !lobby.homeTeam.find((p) => p === m)
    );
  });

  constructor() {
    this._lobbyIdentifier.set(this._route.snapshot.paramMap.get('id') ?? null);
    this.load();
    this._websocketService.socket.addEventListener("message", event => {
      if (event.data.includes("lobby")) {
        const splitData = event.data.split(" ");
        const lobbyIndex = splitData.findIndex((s: string) => s === "lobby") + 1;
        if (!lobbyIndex) return;
        if (splitData[lobbyIndex] === this._lobby()?.id) {
          this.load();
        }
      }
    });
  }

  private load() {
    const id: Nullable<string> = this._lobbyIdentifier();
    const token: Nullable<string> = localStorage.getItem('key') ?? null;
    if (!id || !token) return;
    this._httpClient
      .get<Lobby>(`${environment.api}/lobby/${id}`, {
        headers: {
          authorization: token,
        },
      })
      .subscribe((lobby) => this._lobby.set(lobby));
  }
}
