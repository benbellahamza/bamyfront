import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-ajouter-visiteur-page',
  standalone: false,
  templateUrl: './ajouter-visiteur-page.component.html',
  styleUrls: ['./ajouter-visiteur-page.component.css']
})
export class AjouterVisiteurPageComponent implements OnInit, OnDestroy {

  // 👤 Données utilisateur
  utilisateur = {
    nom: '',
    prenom: '',
    email: '',
    role: ''
  };

  // 🎛️ États de l'interface
  menuOuvert: boolean = false;
  modalePasswordVisible = false;

  // 🔒 Gestion du mot de passe
  motDePasseVisible = false;
  confirmationVisible = false;
  confirmationMotDePasse: string = '';
  ancienMotDePasse: string = '';
  nouveauMotDePasse: string = '';

  // 💬 Messages
  messageSuccess: string = '';
  messageErreur: string = '';

  // 🔄 États de chargement
  loading = false;

  // 🎯 Écouteurs d'événements
  private clickListener: any;
  private keyListener: any;

  constructor(
    private http: HttpClient, 
    private router: Router
  ) {}

  ngOnInit(): void {
    this.recupererInfosUtilisateur();
    this.setupEventListeners();
  }

  ngOnDestroy(): void {
    this.cleanupEventListeners();
  }

  // 🚀 Configuration des écouteurs d'événements
  private setupEventListeners(): void {
    // Écouteur pour fermer le menu en cliquant à l'extérieur
    this.clickListener = (event: Event) => {
      const target = event.target as HTMLElement;
      const menuContainer = target.closest('.relative');
      
      if (!menuContainer && this.menuOuvert) {
        this.menuOuvert = false;
      }
    };

    // Écouteur pour fermer avec Escape
    this.keyListener = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (this.modalePasswordVisible) {
          this.fermerModalePassword();
        } else if (this.menuOuvert) {
          this.menuOuvert = false;
        }
      }
    };

    document.addEventListener('click', this.clickListener);
    document.addEventListener('keydown', this.keyListener);
  }

  // 🧹 Nettoyage des écouteurs
  private cleanupEventListeners(): void {
    if (this.clickListener) {
      document.removeEventListener('click', this.clickListener);
    }
    if (this.keyListener) {
      document.removeEventListener('keydown', this.keyListener);
    }
  }

  // 🔐 Récupération et décodage des informations utilisateur depuis le JWT
  recupererInfosUtilisateur(): void {
    const token = localStorage.getItem('access-token');
    
    if (!token) {
      console.warn('⚠️ Aucun token d\'accès trouvé');
      this.redirectToLogin();
      return;
    }

    try {
      // Décodage du JWT
      const payload = token.split('.')[1];
      const decodedPayload = atob(payload);
      const decoded = JSON.parse(decodedPayload);

      // Vérification de l'expiration du token
      const currentTime = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < currentTime) {
        console.warn('⚠️ Token expiré');
        this.redirectToLogin();
        return;
      }

      // Mise à jour des informations utilisateur
      this.utilisateur = {
        nom: decoded.nom || 'Utilisateur',
        prenom: decoded.prenom || '',
        email: decoded.sub || decoded.email || '',
        role: this.formatRole(decoded.scope || decoded.role || 'UTILISATEUR')
      };

      console.log('✅ Informations utilisateur récupérées:', this.utilisateur);

    } catch (error) {
      console.error('❌ Erreur lors du décodage du token JWT:', error);
      this.showErrorMessage('Erreur d\'authentification. Veuillez vous reconnecter.');
      setTimeout(() => this.redirectToLogin(), 2000);
    }
  }

  // 🎨 Formatage du rôle pour l'affichage
  private formatRole(role: string): string {
    const roleMap: { [key: string]: string } = {
      'ADMIN': 'Administrateur',
      'USER': 'Utilisateur',
      'UTILISATEUR': 'Utilisateur',
      'MANAGER': 'Gestionnaire',
      'SUPERVISOR': 'Superviseur'
    };

    return roleMap[role.toUpperCase()] || role;
  }

  // 🚪 Redirection vers la page de connexion
  private redirectToLogin(): void {
    localStorage.clear();
    this.router.navigate(['/']);
  }

  // 🎛️ Gestion du menu utilisateur
  toggleMenu(): void {
    this.menuOuvert = !this.menuOuvert;
  }

  // 🔒 Ouverture de la modale de changement de mot de passe
  ouvrirModalePassword(): void {
    this.resetPasswordForm();
    this.modalePasswordVisible = true;
    this.menuOuvert = false;
    
    // Focus automatique sur le premier champ après un délai
    setTimeout(() => {
      const firstInput = document.querySelector('.modale-password input') as HTMLInputElement;
      if (firstInput) {
        firstInput.focus();
      }
    }, 100);
  }

  // 🔒 Fermeture de la modale de changement de mot de passe
  fermerModalePassword(): void {
    this.modalePasswordVisible = false;
    this.resetPasswordForm();
  }

  // 🧹 Réinitialisation du formulaire de mot de passe
  private resetPasswordForm(): void {
    this.ancienMotDePasse = '';
    this.nouveauMotDePasse = '';
    this.confirmationMotDePasse = '';
    this.messageErreur = '';
    this.messageSuccess = '';
    this.motDePasseVisible = false;
    this.confirmationVisible = false;
  }

  // 🔄 Changement du mot de passe
  changerMotDePasse(): void {
    // Validation des champs
    if (!this.validatePasswordForm()) {
      return;
    }

    this.loading = true;
    this.messageErreur = '';
    this.messageSuccess = '';

    const payload = {
      ancienMotDePasse: this.ancienMotDePasse.trim(),
      nouveauMotDePasse: this.nouveauMotDePasse.trim()
    };

    console.log('🔄 Tentative de changement de mot de passe...');

    this.http.post('http://localhost:8085/auth/update-password', payload, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access-token')}`,
        'Content-Type': 'application/json'
      }
    }).subscribe({
      next: (response: any) => {
        console.log('✅ Mot de passe changé avec succès');
        this.messageSuccess = response.message || 'Mot de passe modifié avec succès !';
        this.messageErreur = '';
        this.loading = false;

        // Fermeture automatique après 2 secondes
        setTimeout(() => {
          this.fermerModalePassword();
        }, 2000);
      },
      error: (error) => {
        console.error('❌ Erreur lors du changement de mot de passe:', error);
        this.loading = false;
        
        // Gestion des différents types d'erreurs
        if (error.status === 400) {
          this.messageErreur = 'Ancien mot de passe incorrect.';
        } else if (error.status === 401) {
          this.messageErreur = 'Session expirée. Veuillez vous reconnecter.';
          setTimeout(() => this.redirectToLogin(), 2000);
        } else if (error.status === 422) {
          this.messageErreur = 'Le nouveau mot de passe ne respecte pas les critères de sécurité.';
        } else {
          this.messageErreur = error.error?.message || 'Erreur lors de la modification du mot de passe.';
        }
        
        this.messageSuccess = '';
      }
    });
  }

  // ✅ Validation du formulaire de mot de passe
  private validatePasswordForm(): boolean {
    // Vérification des champs vides
    if (!this.ancienMotDePasse.trim()) {
      this.messageErreur = 'Veuillez saisir votre ancien mot de passe.';
      return false;
    }

    if (!this.nouveauMotDePasse.trim()) {
      this.messageErreur = 'Veuillez saisir un nouveau mot de passe.';
      return false;
    }

    if (!this.confirmationMotDePasse.trim()) {
      this.messageErreur = 'Veuillez confirmer votre nouveau mot de passe.';
      return false;
    }

    // Vérification de la correspondance
    if (this.nouveauMotDePasse !== this.confirmationMotDePasse) {
      this.messageErreur = 'Les mots de passe ne correspondent pas.';
      return false;
    }

    // Vérification de la longueur minimum
    if (this.nouveauMotDePasse.length < 6) {
      this.messageErreur = 'Le nouveau mot de passe doit contenir au moins 6 caractères.';
      return false;
    }

    // Vérification que le nouveau mot de passe est différent de l'ancien
    if (this.ancienMotDePasse === this.nouveauMotDePasse) {
      this.messageErreur = 'Le nouveau mot de passe doit être différent de l\'ancien.';
      return false;
    }

    return true;
  }

  // 🚪 Déconnexion sécurisée
  logout(): void {
    // Confirmation de déconnexion
    if (!confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
      return;
    }

    console.log('🚪 Déconnexion en cours...');

    // Nettoyage des données locales
    try {
      localStorage.clear();
      sessionStorage.clear();
      
      // Suppression des cookies si nécessaire
      document.cookie.split(";").forEach((c) => {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });

      console.log('✅ Données locales nettoyées');

    } catch (error) {
      console.error('❌ Erreur lors du nettoyage:', error);
    }

    // Redirection vers la page de connexion
    this.router.navigate(['/login']).then(() => {
      console.log('✅ Redirection effectuée');
    }).catch((error) => {
      console.error('❌ Erreur de redirection:', error);
      // Fallback
      window.location.href = '/';
    });
  }

  // 💬 Affichage des messages d'erreur
  private showErrorMessage(message: string): void {
    this.messageErreur = message;
    this.messageSuccess = '';
    
    // Auto-hide après 5 secondes
    setTimeout(() => {
      this.messageErreur = '';
    }, 5000);
  }

  // 💬 Affichage des messages de succès
  private showSuccessMessage(message: string): void {
    this.messageSuccess = message;
    this.messageErreur = '';
    
    // Auto-hide après 3 secondes
    setTimeout(() => {
      this.messageSuccess = '';
    }, 3000);
  }

  // 🎯 Gestion des clics extérieurs (alternative au HostListener)
  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    const target = event.target as HTMLElement;
    
    // Fermer le menu si clic à l'extérieur
    if (this.menuOuvert && !target.closest('.user-menu-container')) {
      this.menuOuvert = false;
    }
  }

  // ⌨️ Gestion des raccourcis clavier
  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    // Escape pour fermer les modales/menus
    if (event.key === 'Escape') {
      if (this.modalePasswordVisible) {
        this.fermerModalePassword();
      } else if (this.menuOuvert) {
        this.menuOuvert = false;
      }
    }

    // Ctrl+M pour ouvrir le menu utilisateur
    if (event.ctrlKey && event.key === 'm') {
      event.preventDefault();
      this.toggleMenu();
    }
  }

  // 🔄 Actualisation de la page
  refresh(): void {
    window.location.reload();
  }

  // 🎨 Méthodes utilitaires pour l'affichage
  getInitials(): string {
    const nom = this.utilisateur.nom.charAt(0).toUpperCase();
    const prenom = this.utilisateur.prenom.charAt(0).toUpperCase();
    return nom + (prenom || '');
  }

  getFullName(): string {
    return `${this.utilisateur.prenom} ${this.utilisateur.nom}`.trim();
  }

  // 📊 Informations de debug (développement uniquement)
  getDebugInfo(): any {
    return {
      utilisateur: this.utilisateur,
      menuOuvert: this.menuOuvert,
      modalePasswordVisible: this.modalePasswordVisible,
      hasToken: !!localStorage.getItem('access-token'),
      timestamp: new Date().toISOString()
    };
  }
}