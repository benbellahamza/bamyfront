import { Component, OnInit, HostListener, Input, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { AdminService } from 'app/core/services/admin/admin.service';

@Component({
  selector: 'app-unified-layout',
  standalone: false,
  templateUrl: './unified-layout.component.html',
  styleUrls: ['./unified-layout.component.css']
})
export class UnifiedLayoutComponent implements OnInit {
  @Input() pageTitle: string = 'Dashboard';
  @Input() navigationItems: any[] = [];
  @Output() passwordChanged = new EventEmitter<void>();

  // Variables utilisateur
  utilisateur = {
    nom: '',
    prenom: '',
    email: '',
    role: ''
  };

  // Variables menu
  menuOuvert = false;

  // Variables modale mot de passe
  modalePasswordVisible = false;
  ancienMotDePasse = '';
  nouveauMotDePasse = '';
  confirmationMotDePasse = '';
  motDePasseVisible = false;
  confirmationVisible = false;
  messageSuccess = '';
  messageErreur = '';

  constructor(
    private router: Router,
    private adminService: AdminService
  ) {}

  ngOnInit(): void {
    this.recupererInfosUtilisateur();
  }

  /**
   * Récupère les informations de l'utilisateur depuis le JWT
   */
  recupererInfosUtilisateur() {
    const token = localStorage.getItem('access-token');
    if (!token) return;

    try {
      const payload = token.split('.')[1];
      const decodedPayload = atob(payload);
      const decoded = JSON.parse(decodedPayload);

      this.utilisateur = {
        nom: decoded.nom || '',
        prenom: decoded.prenom || '',
        email: decoded.sub || '',
        role: decoded.scope || ''
      };
    } catch (e) {
      console.error('❌ Erreur de décodage du JWT :', e);
    }
  }

  /**
   * Gestion du menu utilisateur
   */
  toggleMenu() {
    this.menuOuvert = !this.menuOuvert;
  }

  /**
   * Ferme le menu si on clique en dehors
   */
  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const clickedInside = (event.target as HTMLElement).closest('.user-menu-container');
    if (!clickedInside) {
      this.menuOuvert = false;
    }
  }

  /**
   * Gestion de la modale mot de passe
   */
  ouvrirModalePassword() {
    this.modalePasswordVisible = true;
    this.resetPasswordForm();
    this.menuOuvert = false;
  }

  fermerModalePassword() {
    this.modalePasswordVisible = false;
    this.resetPasswordForm();
  }

  resetPasswordForm() {
    this.ancienMotDePasse = '';
    this.nouveauMotDePasse = '';
    this.confirmationMotDePasse = '';
    this.messageErreur = '';
    this.messageSuccess = '';
    this.motDePasseVisible = false;
    this.confirmationVisible = false;
  }

  /**
   * Change le mot de passe de l'utilisateur
   */
  changerMotDePasse(): void {
    // Validation des champs
    if (!this.ancienMotDePasse || !this.nouveauMotDePasse || !this.confirmationMotDePasse) {
      this.messageErreur = '❌ Veuillez remplir tous les champs.';
      this.messageSuccess = '';
      return;
    }

    if (this.nouveauMotDePasse !== this.confirmationMotDePasse) {
      this.messageErreur = '❌ Les mots de passe ne correspondent pas.';
      this.messageSuccess = '';
      return;
    }

    if (this.nouveauMotDePasse.length < 6) {
      this.messageErreur = '❌ Le mot de passe doit contenir au moins 6 caractères.';
      this.messageSuccess = '';
      return;
    }

    // Appel du service
    this.adminService.changerMotDePasseActuel(
      this.utilisateur.email,
      this.ancienMotDePasse,
      this.nouveauMotDePasse
    ).subscribe({
      next: () => {
        this.messageSuccess = '✅ Mot de passe changé avec succès.';
        this.messageErreur = '';
        this.passwordChanged.emit();
        
        // Fermer la modale après 2 secondes
        setTimeout(() => {
          this.fermerModalePassword();
        }, 2000);
      },
      error: (err) => {
        this.messageErreur = err.error?.message || '❌ Erreur lors de la mise à jour.';
        this.messageSuccess = '';
      }
    });
  }

  /**
   * Déconnexion de l'utilisateur
   */
  logout() {
    if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
      localStorage.removeItem('access-token');
      localStorage.removeItem('role');
      this.router.navigate(['/']);
    }
  }

  /**
   * Retourne la couleur du badge selon le rôle
   */
  getBadgeRoleClass(): string {
    switch (this.utilisateur.role) {
      case 'ADMIN':
        return 'bg-blue-100 text-blue-800';
      case 'RESPONSABLE':
        return 'bg-amber-100 text-amber-800';
      case 'AGENT':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  }

  /**
   * Retourne les initiales de l'utilisateur
   */
  getUserInitials(): string {
    const nom = this.utilisateur.nom[0] || '';
    const prenom = this.utilisateur.prenom[0] || '';
    return (nom + prenom).toUpperCase();
  }

  /**
   * Vérifie si les mots de passe correspondent
   */
  passwordsMatch(): boolean {
    return this.nouveauMotDePasse === this.confirmationMotDePasse;
  }

  /**
   * Vérifie si le formulaire est valide
   */
  isFormValid(): boolean {
    return this.ancienMotDePasse.length > 0 && 
           this.nouveauMotDePasse.length >= 6 && 
           this.passwordsMatch();
  }

  /**
   * Toggle la visibilité du mot de passe
   */
  togglePasswordVisibility() {
    this.motDePasseVisible = !this.motDePasseVisible;
  }

  /**
   * Toggle la visibilité de la confirmation
   */
  toggleConfirmationVisibility() {
    this.confirmationVisible = !this.confirmationVisible;
  }
}