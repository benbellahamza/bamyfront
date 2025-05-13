import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminVisiteurComponent } from './admin-visiteur.component';

describe('AdminVisiteurComponent', () => {
  let component: AdminVisiteurComponent;
  let fixture: ComponentFixture<AdminVisiteurComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AdminVisiteurComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminVisiteurComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
