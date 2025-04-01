import { HttpClient } from '@angular/common/http';
import {
  Component,
  inject,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';

interface DiscordUser {
  accent_color: number;
  avatar: string;
  avatar_decoration_data: null;
  banner: null;
  banner_color: string;
  clan: null;
  collectibles: null;
  discriminator: string;
  email: string;
  flags: number;
  global_name: string;
  id: string;
  locale: string;
  mfa_enabled: boolean;
  premium_type: number;
  primary_guild: null;
  public_flags: number;
  username: string;
  verified: boolean;
}

export type Nullable<T> = null | T;

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  private readonly _webSocket: WebSocket = new WebSocket(
    'http://localhost:4030'
  );
  private readonly _httpClient: HttpClient = inject(HttpClient);
  private readonly _username: WritableSignal<Nullable<string>> = signal(null);
  private readonly _avatar: WritableSignal<Nullable<string>> = signal(null);
  protected readonly username: Signal<Nullable<string>> =
    this._username.asReadonly();
  protected readonly avatar: Signal<Nullable<string>> =
    this._avatar.asReadonly();
  constructor() {
    this._webSocket.addEventListener('message', (message) => {
      console.log(message);
    });

    const fragment = new URLSearchParams(window.location.hash.slice(1));
    let [accessToken, tokenType] = [
      fragment.get('access_token'),
      fragment.get('token_type'),
    ];
    if (accessToken && tokenType) {
      localStorage.setItem('token', accessToken);
      localStorage.setItem('tokenType', tokenType);
    }

    accessToken = localStorage.getItem('token');
    tokenType = localStorage.getItem('tokenType');

    if (!accessToken || !tokenType) return;

    this._httpClient
      .get<DiscordUser>('https://discord.com/api/users/@me', {
        headers: {
          authorization: `${tokenType} ${accessToken}`,
        },
      })
      .subscribe((response) => {
        this._username.set(response.global_name);
        this._avatar.set(
          `https://cdn.discordapp.com/avatars/${response.id}/${response.avatar}.png`
        );
        this._join({
          avatar: response.avatar,
          email: response.email,
          id: response.id,
          username: response.global_name,
        });
      });
  }

  private _join(user: {
    id: string;
    avatar: string;
    email: string;
    username: string;
  }) {
    this._httpClient
      .post<{ token: string }>('http://localhost:4000/join', user)
      .subscribe((result) => {
        localStorage.setItem('key', result.token);
        this._webSocket.send(`join$${result.token}`);
      });
  }
}
