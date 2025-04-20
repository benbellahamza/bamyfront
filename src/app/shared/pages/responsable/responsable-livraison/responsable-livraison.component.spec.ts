import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResponsableLivraisonComponent } from './responsable-livraison.component';

describe('ResponsableLivraisonComponent', () => {
  let component: ResponsableLivraisonComponent;
  let fixture: ComponentFixture<ResponsableLivraisonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ResponsableLivraisonComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResponsableLivraisonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
