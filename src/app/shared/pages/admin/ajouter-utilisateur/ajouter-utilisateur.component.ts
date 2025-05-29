import { Component, OnInit, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from 'app/core/services/admin/admin.service';

// 🔧 INTERFACES
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
export class AjouterUtilisateurComponent implements OnInit {
  // 📋 FORMULAIRE
  userForm!: FormGroup;
  
  // 🎭 RÔLES DISPONIBLES
  roles: string[] = ['ADMIN', 'AGENT', 'RESPONSABLE'];
  
  // 💬 MESSAGES
  successMessage = '';
  errorMessage = '';
  
  // 🔐 GESTION MOT DE PASSE
  motDePasseVisible = false;
  confirmationMotDePasse = '';
  confirmationVisible = false;
  
  // 👤 UTILISATEUR CONNECTÉ
  utilisateur: Utilisateur = { nom: '', prenom: '', email: '', role: '' };
  menuOuvert = false;
  
  // 🔐 MODALE MOT DE PASSE
  modalePasswordVisible = false;
  ancienMotDePasse = '';
  nouveauMotDePasse = '';
  messagePasswordSuccess = '';
  messagePasswordErreur = '';
  
  // 🛠️ UTILITAIRES
  isLoading = false;
  currentYear = new Date().getFullYear();

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

  // 🏗️ INITIALISATION DU FORMULAIRE
  private initializeForm(): void {
    this.userForm = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(2)]],
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['', Validators.required]
    });
  }

  // 👤 RÉCUPÉRATION INFOS UTILISATEUR
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

  // 📝 SOUMISSION DU FORMULAIRE
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

    this.adminService.ajouterUtilisateur(nouvelUtilisateur).subscribe({
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
  }

  // 🔍 VALIDATION FORMULAIRE
  private marquerTousLesChampsCommeTouches(): void {
    Object.keys(this.userForm.controls).forEach(key => {
      this.userForm.get(key)?.markAsTouched();
    });
  }

  // 🎯 GETTERS POUR VALIDATION
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

  // 🔐 GESTION VISIBILITÉ MOT DE PASSE
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

  // 🔄 RÉINITIALISATION FORMULAIRE
  reinitialiserFormulaire(): void {
    this.userForm.reset();
    this.confirmationMotDePasse = '';
    this.successMessage = '';
    this.errorMessage = '';
  }

  // 🏠 RETOUR AU DASHBOARD
  retourDashboard(): void {
    this.router.navigate(['/admin/dashboard']);
  }

  // 🔐 GESTION MODALE MOT DE PASSE
  ouvrirModalePassword(): void {
    this.modalePasswordVisible = true;
    this.messagePasswordSuccess = '';
    this.messagePasswordErreur = '';
    this.ancienMotDePasse = '';
    this.nouveauMotDePasse = '';
    this.menuOuvert = false;
  }

  fermerModalePassword(): void {
    this.modalePasswordVisible = false;
    this.ancienMotDePasse = '';
    this.nouveauMotDePasse = '';
    this.messagePasswordSuccess = '';
    this.messagePasswordErreur = '';
  }

  changerMotDePasse(): void {
    if (!this.ancienMotDePasse?.trim()) {
      this.messagePasswordErreur = '❌ L\'ancien mot de passe est requis';
      this.messagePasswordSuccess = '';
      return;
    }

    if (!this.nouveauMotDePasse?.trim()) {
      this.messagePasswordErreur = '❌ Le nouveau mot de passe est requis';
      this.messagePasswordSuccess = '';
      return;
    }

    if (this.nouveauMotDePasse.length < 6) {
      this.messagePasswordErreur = '❌ Le mot de passe doit contenir au moins 6 caractères';
      this.messagePasswordSuccess = '';
      return;
    }

    this.adminService.changerMotDePasseActuel(
      this.utilisateur.email,
      this.ancienMotDePasse,
      this.nouveauMotDePasse
    ).subscribe({
      next: () => {
        this.messagePasswordSuccess = '✅ Mot de passe modifié avec succès';
        this.messagePasswordErreur = '';
        
        setTimeout(() => {
          this.fermerModalePassword();
        }, 2000);
      },
      error: (err) => {
        console.error('❌ Erreur changement mot de passe :', err);
        this.messagePasswordErreur = err.error?.message || '❌ Erreur lors du changement de mot de passe';
        this.messagePasswordSuccess = '';
      }
    });
  }

  // 🚪 DÉCONNEXION
  logout(): void {
    if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
      try {
        localStorage.removeItem('access-token');
        localStorage.removeItem('role');
        localStorage.removeItem('user-data');
        window.location.href = '/';
      } catch (error) {
        console.error('❌ Erreur lors de la déconnexion :', error);
        window.location.href = '/';
      }
    }
  }

  // 🖱️ GESTION CLICS EXTERNES
  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const menuContainer = target.closest('.relative');
    
    if (!menuContainer) {
      this.menuOuvert = false;
    }
  }

  // 🎨 MÉTHODES UTILITAIRES POUR CSS
  getInputClass(controlName: string): string {
    const control = this.userForm.get(controlName);
    const baseClasses = 'input input-bordered w-full pl-10 pr-4 bg-slate-50 border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all';
    
    if (control?.invalid && control?.touched) {
      return `${baseClasses} border-red-300 focus:border-red-500 focus:ring-red-200`;
    }
    
    if (control?.valid && control?.touched) {
      return `${baseClasses} border-green-300 focus:border-green-500 focus:ring-green-200`;
    }
    
    return baseClasses;
  }

  // 📊 VALIDATION EN TEMPS RÉEL
  get peutSoumettre(): boolean {
    return this.userForm.valid && 
           (!this.confirmationMotDePasse || this.confirmationValide) && 
           !this.isLoading;
  }
}