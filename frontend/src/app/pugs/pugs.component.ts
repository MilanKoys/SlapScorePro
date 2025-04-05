import { Component, signal } from '@angular/core';
import { DropdownSelectComponent } from '../dropdown-select/dropdown-select.component';

@Component({
  selector: 'app-pugs',
  imports: [DropdownSelectComponent],
  templateUrl: './pugs.component.html',
  styleUrl: './pugs.component.scss',
})
export class PugsComponent {
  title = 'hocičo to je jedno';
  avatar = signal('fsa');
}
