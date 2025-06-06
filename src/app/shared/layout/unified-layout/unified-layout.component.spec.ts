import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AdminService } from 'app/core/services/admin/admin.service';
import { UnifiedLayoutComponent } from './unified-layout.component';

describe('UnifiedLayoutComponent', () => {
  let component: UnifiedLayoutComponent;
  let fixture: ComponentFixture<UnifiedLayoutComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockAdminService: jasmine.SpyObj<AdminService>;

  beforeEach(async () => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const adminServiceSpy = jasmine.createSpyObj('AdminService', ['changerMotDePasseActuel']);

    await TestBed.configureTestingModule({
      declarations: [UnifiedLayoutComponent],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: AdminService, useValue: adminServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UnifiedLayoutComponent);
    component = fixture.componentInstance;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    mockAdminService = TestBed.inject(AdminService) as jasmine.SpyObj<AdminService>;
  });

  beforeEach(() => {
    // Mock localStorage
    const mockToken = btoa(JSON.stringify({
      nom: 'Doe',
      prenom: 'John',
      sub: 'john.doe@example.com',
      scope: 'ADMIN'
    }));
    spyOn(localStorage, 'getItem').and.returnValue(`header.${mockToken}.signature`);
    spyOn(localStorage, 'removeItem');
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should initialize user information on init', () => {
      component.ngOnInit();
      
      expect(component.utilisateur.nom).toBe('Doe');
      expect(component.utilisateur.prenom).toBe('John');
      expect(component.utilisateur.email).toBe('john.doe@example.com');
      expect(component.utilisateur.role).toBe('ADMIN');
    });
  });

  describe('recupererInfosUtilisateur', () => {
    it('should decode JWT token and set user info', () => {
      component.recupererInfosUtilisateur();
      
      expect(component.utilisateur.nom).toBe('Doe');
      expect(component.utilisateur.prenom).toBe('John');
      expect(component.utilisateur.email).toBe('john.doe@example.com');
      expect(component.utilisateur.role).toBe('ADMIN');
    });

    it('should handle missing token gracefully', () => {
      (localStorage.getItem as jasmine.Spy).and.returnValue(null);
      
      component.recupererInfosUtilisateur();
      
      expect(component.utilisateur.nom).toBe('');
      expect(component.utilisateur.prenom).toBe('');
      expect(component.utilisateur.email).toBe('');
      expect(component.utilisateur.role).toBe('');
    });

    it('should handle invalid token gracefully', () => {
      (localStorage.getItem as jasmine.Spy).and.returnValue('invalid.token.format');
      spyOn(console, 'error');
      
      component.recupererInfosUtilisateur();
      
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Menu Management', () => {
    it('should toggle menu visibility', () => {
      expect(component.menuOuvert).toBeFalse();
      
      component.toggleMenu();
      expect(component.menuOuvert).toBeTrue();
      
      component.toggleMenu();
      expect(component.menuOuvert).toBeFalse();
    });

    it('should close menu on outside click', () => {
      component.menuOuvert = true;
      
      const mockEvent = {
        target: {
          closest: jasmine.createSpy('closest').and.returnValue(null)
        }
      } as any;
      
      component.onClickOutside(mockEvent);
      
      expect(component.menuOuvert).toBeFalse();
    });

    it('should not close menu on inside click', () => {
      component.menuOuvert = true;
      
      const mockEvent = {
        target: {
          closest: jasmine.createSpy('closest').and.returnValue(document.createElement('div'))
        }
      } as any;
      
      component.onClickOutside(mockEvent);
      
      expect(component.menuOuvert).toBeTrue();
    });
  });

  describe('Password Modal Management', () => {
    it('should open password modal', () => {
      component.ouvrirModalePassword();
      
      expect(component.modalePasswordVisible).toBeTrue();
      expect(component.menuOuvert).toBeFalse();
      expect(component.ancienMotDePasse).toBe('');
      expect(component.nouveauMotDePasse).toBe('');
      expect(component.confirmationMotDePasse).toBe('');
    });

    it('should close password modal', () => {
      component.modalePasswordVisible = true;
      component.ancienMotDePasse = 'test';
      component.nouveauMotDePasse = 'test';
      
      component.fermerModalePassword();
      
      expect(component.modalePasswordVisible).toBeFalse();
      expect(component.ancienMotDePasse).toBe('');
      expect(component.nouveauMotDePasse).toBe('');
    });

    it('should reset password form', () => {
      component.ancienMotDePasse = 'old';
      component.nouveauMotDePasse = 'new';
      component.confirmationMotDePasse = 'new';
      component.messageSuccess = 'success';
      component.messageErreur = 'error';
      
      component.resetPasswordForm();
      
      expect(component.ancienMotDePasse).toBe('');
      expect(component.nouveauMotDePasse).toBe('');
      expect(component.confirmationMotDePasse).toBe('');
      expect(component.messageSuccess).toBe('');
      expect(component.messageErreur).toBe('');
    });
  });

  describe('Password Change', () => {
    beforeEach(() => {
      component.utilisateur.email = 'test@example.com';
    });

    it('should validate required fields', () => {
      component.changerMotDePasse();
      
      expect(component.messageErreur).toContain('Veuillez remplir tous les champs');
      expect(mockAdminService.changerMotDePasseActuel).not.toHaveBeenCalled();
    });

    it('should validate password confirmation', () => {
      component.ancienMotDePasse = 'old123';
      component.nouveauMotDePasse = 'new123';
      component.confirmationMotDePasse = 'different';
      
      component.changerMotDePasse();
      
      expect(component.messageErreur).toContain('ne correspondent pas');
      expect(mockAdminService.changerMotDePasseActuel).not.toHaveBeenCalled();
    });

    it('should validate password length', () => {
      component.ancienMotDePasse = 'old123';
      component.nouveauMotDePasse = '123';
      component.confirmationMotDePasse = '123';
      
      component.changerMotDePasse();
      
      expect(component.messageErreur).toContain('au moins 6 caractères');
      expect(mockAdminService.changerMotDePasseActuel).not.toHaveBeenCalled();
    });

    it('should successfully change password', fakeAsync(() => {
      component.ancienMotDePasse = 'old123456';
      component.nouveauMotDePasse = 'new123456';
      component.confirmationMotDePasse = 'new123456';
      
      mockAdminService.changerMotDePasseActuel.and.returnValue(of({}));
      spyOn(component.passwordChanged, 'emit');
      spyOn(component, 'fermerModalePassword');
      
      component.changerMotDePasse();
      
      expect(mockAdminService.changerMotDePasseActuel).toHaveBeenCalledWith(
        'test@example.com',
        'old123456',
        'new123456'
      );
      expect(component.messageSuccess).toContain('changé avec succès');
      expect(component.passwordChanged.emit).toHaveBeenCalled();
      
      tick(2000);
      expect(component.fermerModalePassword).toHaveBeenCalled();
    }));

    it('should handle password change error', () => {
      component.ancienMotDePasse = 'old123456';
      component.nouveauMotDePasse = 'new123456';
      component.confirmationMotDePasse = 'new123456';
      
      const errorResponse = { error: { message: 'Mot de passe incorrect' } };
      mockAdminService.changerMotDePasseActuel.and.returnValue(throwError(errorResponse));
      
      component.changerMotDePasse();
      
      expect(component.messageErreur).toBe('Mot de passe incorrect');
      expect(component.messageSuccess).toBe('');
    });
  });

  describe('Logout', () => {
    it('should logout when confirmed', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      
      component.logout();
      
      expect(localStorage.removeItem).toHaveBeenCalledWith('access-token');
      expect(localStorage.removeItem).toHaveBeenCalledWith('role');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
    });

    it('should not logout when cancelled', () => {
      spyOn(window, 'confirm').and.returnValue(false);
      
      component.logout();
      
      expect(localStorage.removeItem).not.toHaveBeenCalled();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });

  describe('Helper Methods', () => {
    it('should return correct badge class for ADMIN', () => {
      component.utilisateur.role = 'ADMIN';
      expect(component.getBadgeRoleClass()).toBe('bg-blue-100 text-blue-800');
    });

    it('should return correct badge class for RESPONSABLE', () => {
      component.utilisateur.role = 'RESPONSABLE';
      expect(component.getBadgeRoleClass()).toBe('bg-amber-100 text-amber-800');
    });

    it('should return correct badge class for AGENT', () => {
      component.utilisateur.role = 'AGENT';
      expect(component.getBadgeRoleClass()).toBe('bg-green-100 text-green-800');
    });

    it('should return default badge class for unknown role', () => {
      component.utilisateur.role = 'UNKNOWN';
      expect(component.getBadgeRoleClass()).toBe('bg-slate-100 text-slate-800');
    });

    it('should return user initials', () => {
      component.utilisateur.nom = 'Doe';
      component.utilisateur.prenom = 'John';
      expect(component.getUserInitials()).toBe('DJ');
    });

    it('should handle empty names for initials', () => {
      component.utilisateur.nom = '';
      component.utilisateur.prenom = '';
      expect(component.getUserInitials()).toBe('');
    });

    it('should check if passwords match', () => {
      component.nouveauMotDePasse = 'password123';
      component.confirmationMotDePasse = 'password123';
      expect(component.passwordsMatch()).toBeTrue();
      
      component.confirmationMotDePasse = 'different';
      expect(component.passwordsMatch()).toBeFalse();
    });

    it('should validate form correctly', () => {
      // Invalid form
      component.ancienMotDePasse = '';
      component.nouveauMotDePasse = '123';
      component.confirmationMotDePasse = '123';
      expect(component.isFormValid()).toBeFalse();
      
      // Valid form
      component.ancienMotDePasse = 'old123456';
      component.nouveauMotDePasse = 'new123456';
      component.confirmationMotDePasse = 'new123456';
      expect(component.isFormValid()).toBeTrue();
    });

    it('should toggle password visibility', () => {
      expect(component.motDePasseVisible).toBeFalse();
      component.togglePasswordVisibility();
      expect(component.motDePasseVisible).toBeTrue();
    });

    it('should toggle confirmation visibility', () => {
      expect(component.confirmationVisible).toBeFalse();
      component.toggleConfirmationVisibility();
      expect(component.confirmationVisible).toBeTrue();
    });
  });
});

// Helper function for fakeAsync tests
import { tick, fakeAsync } from '@angular/core/testing';