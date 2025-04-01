import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { InputComponent } from '../input/input.component';
import { DropdownSelectComponent } from '../dropdown-select/dropdown-select.component';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { Arena, CreateLobby, GameMode, Lobby, Region } from '../contracts';

type Nullable<T> = T | null;

interface LobbyFormValues {
  name: string;
  region: Region;
  password?: string;
  creator: string;
  arena: Arena;
  gameMode: GameMode;
  usePeriod: string;
  period?: number;
  teamSize: number;
  matchLength: number;
}

interface LobbyForm {
  name: FormControl<Nullable<string>>;
  region: FormControl<Nullable<Region>>;
  password: FormControl<Nullable<string>>;
  creator: FormControl<Nullable<string>>;
  arena: FormControl<Nullable<Arena>>;
  gameMode: FormControl<Nullable<GameMode>>;
  usePeriod: FormControl<Nullable<string>>;
  period: FormControl<Nullable<number>>;
  teamSize: FormControl<Nullable<number>>;
  matchLength: FormControl<Nullable<number>>;
}

@Component({
  selector: 'app-create-lobby',
  imports: [
    CommonModule,
    FormsModule,
    InputComponent,
    DropdownSelectComponent,
    ReactiveFormsModule,
  ],
  templateUrl: './create-lobby.component.html',
  styleUrl: './create-lobby.component.scss',
})
export class CreateLobbyComponent {
  private readonly _router: Router = inject(Router);
  private readonly _httpClient: HttpClient = inject(HttpClient);
  private readonly _formBuilder: FormBuilder = inject(FormBuilder);
  private readonly _form: FormGroup<LobbyForm> = this._formBuilder.group({
    name: this._formBuilder.control<Nullable<string>>(null, [
      Validators.required,
    ]),
    region: this._formBuilder.control<Nullable<Region>>(null),
    password: this._formBuilder.control<Nullable<string>>(null),
    creator: this._formBuilder.control<Nullable<string>>(null),
    arena: this._formBuilder.control<Nullable<Arena>>(null),
    gameMode: this._formBuilder.control<Nullable<GameMode>>(null),
    usePeriod: this._formBuilder.control<Nullable<string>>(null),
    period: this._formBuilder.control<Nullable<number>>(null),
    teamSize: this._formBuilder.control<Nullable<number>>(null),
    matchLength: this._formBuilder.control<Nullable<number>>(null),
  });
  private readonly _newLobby: WritableSignal<Nullable<Lobby>> = signal(null);
  protected readonly newLobby: Signal<Nullable<Lobby>> =
    this._newLobby.asReadonly();
  protected readonly regions = Object.keys(Region);
  protected readonly arenas = Object.keys(Arena);
  protected readonly gameModes = Object.keys(GameMode);

  protected create() {
    const token: Nullable<string> = localStorage.getItem('key') ?? null;
    if (!token) return;
    const formValues: LobbyFormValues =
      this.form.getRawValue() as LobbyFormValues;
    const body: CreateLobby & { selfJoin: boolean } = {
      ...formValues,
      password: formValues.password ?? undefined,
      period: formValues.period ?? undefined,
      usePeriod: formValues.usePeriod === 'Yes' ? true : false,
      selfJoin: false,
    };
    this._httpClient
      .post<Lobby>('http://localhost:4000/lobby', body, {
        headers: {
          authorization: token,
        },
      })
      .subscribe((result) => {
        this._newLobby.set(result);
        this._router.navigateByUrl(`/lobby/${result.id}`);
      });
  }

  protected get form() {
    return this._form;
  }
}
