import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private readonly _webSocket: WebSocket = new WebSocket(
    environment.websocket
  );

  constructor() {
  }

  public join() {
    const token = localStorage.getItem("key");
    this._webSocket.send(`join$${token}`);
  }

  public get socket() {
    return this._webSocket;
  }
}
