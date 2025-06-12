import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from 'app/core/services/admin/admin.service';

// ✅ INTERFACES
interface Utilisateur {
  nom: string;
  prenom: string;
  email: string;
  role: string;
}

interface NouvelUtilisateur extends Utilisateur {
  password: string;
}

@Component({
  selector: 'app-ajouter-utilisateur',
  standalone: false,
  templateUrl: './ajouter-utilisateur.component.html',
  styleUrls: ['./ajouter-utilisateur.component.css']
})
export class AjouterUtilisateurComponent implements OnInit, OnDestroy {
  
  // ✅ CONFIGURATION NAVIGATION
  navigationItems = [
    {
      label: 'Tableau de bord',
      route: '/admin/dashboard',
      icon: 'dashboard',
      active: false
    },
    {
      label: 'Historique des actions',
      route: '/admin/historique',
      icon: 'history',
      active: false
    },
    {
      label: 'Gestion des visiteurs',
      route: '/admin/visiteur',
      icon: 'users',
      active: false
    },
    {
      label: 'Gestion des livraisons',
      route: '/admin/livraison',
      icon: 'truck',
      active: false
    },
    {
      label: 'Ajouter un utilisateur',
      route: '/admin/ajouter-utilisateur',
      icon: 'user-plus',
      active: true
    }
  ];

  // ✅ FORMULAIRE
  userForm!: FormGroup;
  
  // ✅ RÔLES DISPONIBLES
  roles: string[] = ['ADMIN', 'AGENT', 'RESPONSABLE'];
  
  // ✅ MESSAGES
  successMessage = '';
  errorMessage = '';
  
  // ✅ GESTION MOT DE PASSE
  motDePasseVisible = false;
  confirmationMotDePasse = '';
  confirmationVisible = false;
  
  // ✅ UTILISATEUR CONNECTÉ
  utilisateur: Utilisateur = { nom: '', prenom: '', email: '', role: '' };
  
  // ✅ UTILITAIRES
  isLoading = false;
  currentYear = new Date().getFullYear();

  // ✅ SUBSCRIPTIONS
  private subscriptions: any[] = [];

  constructor(
    private fb: FormBuilder, 
    private adminService: AdminService, 
    private router: Router
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.recupererInfosUtilisateur();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => {
      if (sub && typeof sub.unsubscribe === 'function') {
        sub.unsubscribe();
      }
    });
  }

  // ✅ CALLBACK LAYOUT UNIFIÉ
  onPasswordChanged(): void {
    console.log('Mot de passe changé depuis le layout unifié');
  }

  // ✅ INITIALISATION DU FORMULAIRE
  private initializeForm(): void {
    this.userForm = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(2)]],
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['', Validators.required]
    });
  }

  // ✅ RÉCUPÉRATION INFOS UTILISATEUR
  recupererInfosUtilisateur(): void {
    const token = localStorage.getItem('access-token');
    if (!token) {
      this.utilisateur = {
        nom: 'Admin',
        prenom: '',
        email: 'admin@bamytrucks.com',
        role: 'ADMIN'
      };
      return;
    }
    
    try {
      const payload = atob(token.split('.')[1]);
      const decoded = JSON.parse(payload);
      this.utilisateur = {
        nom: decoded.nom || 'Admin',
        prenom: decoded.prenom || '',
        email: decoded.sub || 'admin@bamytrucks.com',
        role: decoded.scope || 'ADMIN'
      };
    } catch (error) {
      console.error('❌ Erreur de décodage du JWT :', error);
      this.utilisateur = {
        nom: 'Admin',
        prenom: '',
        email: 'admin@bamytrucks.com',
        role: 'ADMIN'
      };
    }
  }

  // ✅ SOUMISSION DU FORMULAIRE
  onSubmit(): void {
    if (this.userForm.invalid) {
      this.marquerTousLesChampsCommeTouches();
      this.errorMessage = '❌ Veuillez corriger les erreurs dans le formulaire';
      return;
    }

    // Validation supplémentaire du mot de passe
    if (this.confirmationMotDePasse && this.userForm.get('password')?.value !== this.confirmationMotDePasse) {
      this.errorMessage = '❌ Les mots de passe ne correspondent pas';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const nouvelUtilisateur: NouvelUtilisateur = this.userForm.value;

    const subscription = this.adminService.ajouterUtilisateur(nouvelUtilisateur).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.successMessage = '✅ Utilisateur ajouté avec succès !';
        this.errorMessage = '';
        
        // Réinitialiser le formulaire
        this.userForm.reset();
        this.confirmationMotDePasse = '';
        
        // Redirection après 2 secondes
        setTimeout(() => {
          this.router.navigate(['/admin/dashboard']);
        }, 2000);
      },
      error: (err) => {
        this.isLoading = false;
        console.error('❌ Erreur ajout utilisateur :', err);
        this.errorMessage = err.error?.message || '❌ Erreur lors de l\'ajout de l\'utilisateur';
        this.successMessage = '';
      }
    });
    this.subscriptions.push(subscription);
  }

  // ✅ VALIDATION FORMULAIRE
  private marquerTousLesChampsCommeTouches(): void {
    Object.keys(this.userForm.controls).forEach(key => {
      this.userForm.get(key)?.markAsTouched();
    });
  }

  // ✅ GETTERS POUR VALIDATION
  get nomInvalid(): boolean {
    const control = this.userForm.get('nom');
    return !!(control?.invalid && control?.touched);
  }

  get prenomInvalid(): boolean {
    const control = this.userForm.get('prenom');
    return !!(control?.invalid && control?.touched);
  }

  get emailInvalid(): boolean {
    const control = this.userForm.get('email');
    return !!(control?.invalid && control?.touched);
  }

  get passwordInvalid(): boolean {
    const control = this.userForm.get('password');
    return !!(control?.invalid && control?.touched);
  }

  get roleInvalid(): boolean {
    const control = this.userForm.get('role');
    return !!(control?.invalid && control?.touched);
  }

  // ✅ GESTION VISIBILITÉ MOT DE PASSE
  toggleMotDePasseVisible(): void {
    this.motDePasseVisible = !this.motDePasseVisible;
  }

  toggleConfirmationVisible(): void {
    this.confirmationVisible = !this.confirmationVisible;
  }

  // ✅ VALIDATION CONFIRMATION MOT DE PASSE
  get confirmationValide(): boolean {
    if (!this.confirmationMotDePasse) return true;
    return this.userForm.get('password')?.value === this.confirmationMotDePasse;
  }

  // ✅ RÉINITIALISATION FORMULAIRE
  reinitialiserFormulaire(): void {
    this.userForm.reset();
    this.confirmationMotDePasse = '';
    this.successMessage = '';
    this.errorMessage = '';
  }

  // ✅ RETOUR AU DASHBOARD
  retourDashboard(): void {
    this.router.navigate(['/admin/dashboard']);
  }

  // ✅ MÉTHODES UTILITAIRES POUR CSS
  getInputBorderClass(controlName: string): string {
    const control = this.userForm.get(controlName);
    
    if (control?.invalid && control?.touched) {
      return 'border-red-300 focus:border-red-500 focus:ring-red-200';
    }
    
    if (control?.valid && control?.touched) {
      return 'border-green-300 focus:border-green-500 focus:ring-green-200';
    }
    
    return '';
  }

  getConfirmationBorderClass(): string {
    if (!this.confirmationMotDePasse) return '';
    
    if (this.confirmationValide) {
      return 'border-green-300 focus:border-green-500 focus:ring-green-200';
    } else {
      return 'border-red-300 focus:border-red-500 focus:ring-red-200';
    }
  }

  // ✅ VALIDATION EN TEMPS RÉEL
  get peutSoumettre(): boolean {
    return this.userForm.valid && 
           (!this.confirmationMotDePasse || this.confirmationValide) && 
           !this.isLoading;
  }

  // ✅ MÉTHODES POUR COMPATIBILITÉ (anciennes méthodes supprimées car gérées par le layout unifié)
  // Le layout unifié gère maintenant :
  // - ouvrirModalePassword()
  // - fermerModalePassword()  
  // - changerMotDePasse()
  // - logout()
  // - onClickOutside()
}