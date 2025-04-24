import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AjouterVisiteurPageComponent } from './ajouter-visiteur-page.component';

describe('AjouterVisiteurPageComponent', () => {
  let component: AjouterVisiteurPageComponent;
  let fixture: ComponentFixture<AjouterVisiteurPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AjouterVisiteurPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AjouterVisiteurPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
