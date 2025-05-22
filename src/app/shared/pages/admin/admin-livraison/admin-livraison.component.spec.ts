import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminLivraisonComponent } from './admin-livraison.component';

describe('AdminLivraisonComponent', () => {
  let component: AdminLivraisonComponent;
  let fixture: ComponentFixture<AdminLivraisonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AdminLivraisonComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminLivraisonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
