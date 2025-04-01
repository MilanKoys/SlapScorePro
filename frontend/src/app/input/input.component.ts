import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  forwardRef,
  input,
  InputSignal,
} from '@angular/core';
import { FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-input',
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true,
    },
  ],
  templateUrl: './input.component.html',
  styleUrl: './input.component.scss',
})
export class InputComponent implements AfterViewInit {
  private onChange: any = () => {};
  private onTouched: any = () => {};
  protected value: string | null = null;
  public readonly label: InputSignal<string> = input.required();
  public readonly initialValue: InputSignal<null | string> = input<
    null | string
  >(null);
  public readonly helperText: InputSignal<string | undefined> = input();

  ngAfterViewInit(): void {
    this.value = this.initialValue();
    this.onChange(this.value);
  }

  onInput(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    this.value = inputElement.value;
    if (!this.value.length) return this.onChange(null);
    this.onChange(this.value);
  }

  writeValue(value: string): void {
    if (value !== undefined) {
      this.value = value;
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }
}
