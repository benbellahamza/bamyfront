import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HistoriqueActiviteComponent } from './historique-activite.component';

describe('HistoriqueActiviteComponent', () => {
  let component: HistoriqueActiviteComponent;
  let fixture: ComponentFixture<HistoriqueActiviteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HistoriqueActiviteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HistoriqueActiviteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
