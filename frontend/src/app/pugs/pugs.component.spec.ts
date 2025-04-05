import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PugsComponent } from './pugs.component';

describe('PugsComponent', () => {
  let component: PugsComponent;
  let fixture: ComponentFixture<PugsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PugsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PugsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
