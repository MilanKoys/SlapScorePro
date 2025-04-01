import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  forwardRef,
  input,
  InputSignal,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import { FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-dropdown-select',
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DropdownSelectComponent),
      multi: true,
    },
  ],
  templateUrl: './dropdown-select.component.html',
  styleUrl: './dropdown-select.component.scss',
})
export class DropdownSelectComponent implements AfterViewInit {
  private onChange: any = () => {};
  private onTouched: any = () => {};
  private readonly _value: WritableSignal<null | string> = signal(null);
  private readonly _open: WritableSignal<boolean> = signal(false);
  protected readonly value: Signal<null | string> = this._value.asReadonly();
  protected readonly open: Signal<boolean> = this._open.asReadonly();
  public readonly label: InputSignal<string> = input.required();
  public readonly helperText: InputSignal<string | undefined> = input();
  public readonly options: InputSignal<string[]> = input.required();
  public readonly initialValue: InputSignal<null | string> = input<
    null | string
  >(null);

  ngAfterViewInit(): void {
    this._value.set(this.initialValue());
    this.onInput();
  }

  onInput() {
    if (!this.value()?.length) return this.onChange(null);
    this.onChange(this.value());
  }

  writeValue(value: string): void {
    if (value !== undefined) {
      this._value.set(value);
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  protected onSelect(value: string | null) {
    this._value.set(value);
    this.onOpen(false);
    this.onInput();
  }

  protected onOpen(open: boolean) {
    this._open.set(open);
  }
}
