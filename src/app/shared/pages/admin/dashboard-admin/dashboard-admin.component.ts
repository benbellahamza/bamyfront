import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidatorFn } from '@angular/forms';
import { AdminService } from 'app/core/services/admin/admin.service';
import { HistoriqueService } from 'app/core/services/historique/historique.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-dashboard-admin',
  standalone: false,
  templateUrl: './dashboard-admin.component.html',
  styleUrls: ['./dashboard-admin.component.css']
})
export class DashboardAdminComponent implements OnInit, OnDestroy {
  // ✅ Configuration pour le layout unifié
  navigationItems = [
    {
      label: 'Tableau de bord',
      route: '/admin/dashboard',
      icon: 'dashboard',
      active: true
    },
    {
      label: 'Historique des actions',
      route: '/admin/historique',
      icon: 'history'
    },
    {
      label: 'Gestion des visiteurs',
      route: '/admin/visiteur',
      icon: 'users'
    },
    {
      label: 'Gestion des livraisons',
      route: '/admin/livraison',
      icon: 'truck'
    }
  ];

  // ✅ Données principales
  utilisateurs: any[] = [];
  historique: any[] = [];
  historiqueDashboard: any[] = [];

  // ✅ Formulaires
  formModif!: FormGroup;
  formReset!: FormGroup;

  // ✅ État des modales
  utilisateurSelectionne: any = null;
  formulaireActif: boolean = false;
  modeForm: 'modifier' | 'reset' | null = null;

  // ✅ Gestion de la visibilité des mots de passe
  showPassword: boolean = false;
  showConfirmPassword: boolean = false;

  // ✅ Statistiques
  totalUtilisateurs: number = 0;
  totalActifs: number = 0;
  totalInactifs: number = 0;

  constructor(
    private adminService: AdminService,
    private historiqueService: HistoriqueService,
    private fb: FormBuilder,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.initFormulaires();
    this.chargerDonnees();
  }

  /**
   * ✅ Validateur personnalisé pour vérifier la correspondance des mots de passe
   */
  private passwordMatchValidator(): ValidatorFn {
    return (formGroup: AbstractControl): { [key: string]: any } | null => {
      const password = formGroup.get('newPassword');
      const confirmPassword = formGroup.get('confirmPassword');

      if (!password || !confirmPassword) {
        return null;
      }

      if (password.value && confirmPassword.value && password.value !== confirmPassword.value) {
        return { passwordMismatch: true };
      }

      return null;
    };
  }

  /**
   * ✅ Initialise les formulaires réactifs
   */
  private initFormulaires(): void {
    this.formModif = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(2)]],
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      role: ['', Validators.required]
    });

    this.formReset = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { 
      validators: this.passwordMatchValidator()
    });

    // ✅ Écouter les changements pour mettre à jour les erreurs de validation
    this.formReset.get('newPassword')?.valueChanges.subscribe(() => {
      this.formReset.get('confirmPassword')?.updateValueAndValidity();
    });
  }

  /**
   * ✅ Charge toutes les données nécessaires
   */
  private chargerDonnees(): void {
    this.chargerUtilisateurs();
    this.chargerHistorique();
  }

  /**
   * ✅ Callback pour le changement de mot de passe du layout unifié
   */
  onPasswordChanged(): void {
    console.log('✅ Mot de passe utilisateur changé depuis le layout unifié');
    // Ici vous pouvez ajouter une logique spécifique si nécessaire
    // Par exemple, recharger certaines données ou afficher une notification
  }

  /**
   * ✅ Toggle la visibilité du mot de passe
   */
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  /**
   * ✅ Toggle la visibilité de la confirmation du mot de passe
   */
  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  /**
   * ✅ Vérifie si les mots de passe correspondent
   */
  get passwordsMatch(): boolean {
    const password = this.formReset.get('newPassword')?.value;
    const confirmPassword = this.formReset.get('confirmPassword')?.value;
    return password === confirmPassword;
  }

  /**
   * ✅ Vérifie si le formulaire de reset a des erreurs de correspondance
   */
  get hasPasswordMismatchError(): boolean {
    return this.formReset.hasError('passwordMismatch') && 
           this.formReset.get('confirmPassword')?.touched === true;
  }

  /**
   * ✅ Charge la liste des utilisateurs
   */
  chargerUtilisateurs(): void {
    this.adminService.getUtilisateurs().subscribe({
      next: (res) => {
        // Filtrer les utilisateurs valides
        this.utilisateurs = res.filter(u => u.role !== null && u.role !== undefined);
        
        // Calculer les statistiques
        this.calculerStatistiques();
        
        console.log('✅ Utilisateurs chargés :', this.utilisateurs.length);
      },
      error: (err) => {
        console.error('❌ Erreur chargement utilisateurs :', err);
        this.utilisateurs = [];
        this.calculerStatistiques();
      }
    });
  }

  /**
   * ✅ Charge l'historique des actions
   */
  chargerHistorique(): void {
    this.historiqueService.getHistorique().subscribe({
      next: (data) => {
        this.historique = data || [];

        // Filtrer les actions récentes (dernières 24h)
        const maintenant = new Date().getTime();
        this.historiqueDashboard = this.historique.filter(action => {
          if (!action.dateAction) return false;
          
          const dateAction = new Date(action.dateAction).getTime();
          const differenceHeures = (maintenant - dateAction) / (1000 * 60 * 60);
          return differenceHeures <= 24;
        }).slice(0, 10); // Limiter à 10 actions récentes

        console.log('✅ Historique chargé :', this.historique.length, 'actions');
        console.log('✅ Actions récentes :', this.historiqueDashboard.length);
      },
      error: (err) => {
        console.error('❌ Erreur chargement historique :', err);
        this.historique = [];
        this.historiqueDashboard = [];
      }
    });
  }

  /**
   * ✅ Calcule les statistiques des utilisateurs
   */
  private calculerStatistiques(): void {
    this.totalUtilisateurs = this.utilisateurs.length;
    this.totalActifs = this.utilisateurs.filter(u => u.actif === true).length;
    this.totalInactifs = this.utilisateurs.filter(u => u.actif === false).length;
  }

  /**
   * ✅ Ouvre le formulaire de modification
   */
  ouvrirFormModification(user: any): void {
    if (!user || !user.id) {
      console.error('❌ Utilisateur invalide pour modification');
      return;
    }

    this.utilisateurSelectionne = { ...user }; // Cloner l'objet
    this.modeForm = 'modifier';
    this.formulaireActif = true;

    // Pré-remplir le formulaire
    this.formModif.patchValue({
      nom: user.nom || '',
      prenom: user.prenom || '',
      email: user.email || '',
      role: user.role || ''
    });

    console.log('✅ Ouverture formulaire modification pour :', user.nom, user.prenom);
  }

  /**
   * ✅ Ouvre le formulaire de reset mot de passe
   */
  ouvrirFormReset(user: any): void {
    if (!user || !user.id) {
      console.error('❌ Utilisateur invalide pour reset');
      return;
    }

    this.utilisateurSelectionne = { ...user }; // Cloner l'objet
    this.modeForm = 'reset';
    this.formulaireActif = true;
    
    // Réinitialiser le formulaire et les états de visibilité
    this.formReset.reset();
    this.showPassword = false;
    this.showConfirmPassword = false;

    console.log('✅ Ouverture formulaire reset pour :', user.nom, user.prenom);
  }

  /**
   * ✅ Ferme tous les formulaires
   */
  fermerFormulaire(): void {
    this.formulaireActif = false;
    this.modeForm = null;
    this.utilisateurSelectionne = null;
    
    // Réinitialiser les formulaires et les états de visibilité
    this.formModif.reset();
    this.formReset.reset();
    this.showPassword = false;
    this.showConfirmPassword = false;

    console.log('✅ Formulaires fermés');
  }

  /**
   * ✅ Soumet la modification d'un utilisateur
   */
  soumettreModification(): void {
    if (this.formModif.invalid) {
      console.error('❌ Formulaire de modification invalide');
      this.marquerChampsCommeTouches(this.formModif);
      return;
    }

    if (!this.utilisateurSelectionne?.id) {
      console.error('❌ Aucun utilisateur sélectionné pour modification');
      return;
    }

    const id = this.utilisateurSelectionne.id;
    const donnees = this.formModif.value;

    console.log('🔄 Modification utilisateur :', id, donnees);

    this.adminService.modifierUtilisateur(id, donnees).subscribe({
      next: (response) => {
        console.log('✅ Utilisateur modifié avec succès');
        
        // Recharger les données
        this.chargerDonnees();
        
        // Fermer le formulaire
        this.fermerFormulaire();
        
        // Optionnel : afficher une notification de succès
        this.afficherNotificationSucces('Utilisateur modifié avec succès');
      },
      error: (err) => {
        console.error('❌ Erreur modification utilisateur :', err);
        this.afficherNotificationErreur(
          err.error?.message || 'Erreur lors de la modification de l\'utilisateur'
        );
      }
    });
  }

  /**
   * ✅ Soumet la réinitialisation du mot de passe
   */
  soumettreReset(): void {
    if (this.formReset.invalid) {
      console.error('❌ Formulaire de reset invalide');
      this.marquerChampsCommeTouches(this.formReset);
      return;
    }

    if (!this.utilisateurSelectionne?.id) {
      console.error('❌ Aucun utilisateur sélectionné pour reset');
      return;
    }

    // Vérification supplémentaire de la correspondance des mots de passe
    if (!this.passwordsMatch) {
      this.afficherNotificationErreur('Les mots de passe ne correspondent pas');
      return;
    }

    const id = this.utilisateurSelectionne.id;
    const nouveauMotDePasse = this.formReset.value.newPassword;
    const nomComplet = `${this.utilisateurSelectionne.nom} ${this.utilisateurSelectionne.prenom}`;

    // Utiliser la nouvelle fonction de confirmation personnalisée
    if (!this.confirmerResetMotDePasse(nomComplet)) {
      return;
    }

    console.log('🔄 Reset mot de passe utilisateur :', id);

    this.adminService.reinitialiserMotDePasse(id, nouveauMotDePasse).subscribe({
      next: (response) => {
        console.log('✅ Mot de passe réinitialisé avec succès');
        
        // Recharger l'historique pour voir la nouvelle action
        this.chargerHistorique();
        
        // Fermer le formulaire
        this.fermerFormulaire();
        
        // Afficher notification de succès
        this.afficherNotificationSucces(
          `🔑 Mot de passe réinitialisé avec succès pour ${nomComplet}`
        );
      },
      error: (err) => {
        console.error('❌ Erreur reset mot de passe :', err);
        this.afficherNotificationErreur(
          err.error?.message || 'Erreur lors de la réinitialisation du mot de passe'
        );
      }
    });
  }

  /**
   * ✅ Toggle l'activation/désactivation d'un utilisateur
   */
  toggleActivation(user: any): void {
    if (!user || !user.id) {
      console.error('❌ Utilisateur invalide pour toggle activation');
      return;
    }

    // Empêcher la désactivation des admins
    if (user.role === 'ADMIN') {
      this.afficherNotificationErreur('🚫 Impossible de modifier le statut d\'un administrateur');
      return;
    }

    const action = user.actif ? 'désactiver' : 'réactiver';
    const nomComplet = `${user.nom} ${user.prenom}`;

    // Utiliser la nouvelle fonction de confirmation personnalisée
    if (!this.confirmerToggleActivation(nomComplet, action)) {
      return;
    }

    console.log(`🔄 ${action} utilisateur :`, user.id);

    this.adminService.toggleActivation(user.id).subscribe({
      next: (response) => {
        console.log(`✅ Utilisateur ${action} avec succès`);
        
        // Recharger les données
        this.chargerDonnees();
        
        // Afficher notification avec emoji approprié
        const emoji = user.actif ? '🔒' : '✅';
        const actionText = user.actif ? 'désactivé' : 'réactivé';
        this.afficherNotificationSucces(
          `${emoji} ${nomComplet} a été ${actionText} avec succès`
        );
      },
      error: (err) => {
        console.error(`❌ Erreur ${action} utilisateur :`, err);
        this.afficherNotificationErreur(
          err.error?.message || `Erreur lors de la ${action.slice(0, -1)}ation de l'utilisateur`
        );
      }
    });
  }

  /**
   * ✅ Méthodes utilitaires
   */

  /**
   * Marque tous les champs d'un formulaire comme touchés pour afficher les erreurs
   */
  private marquerChampsCommeTouches(form: FormGroup): void {
    Object.keys(form.controls).forEach(key => {
      const control = form.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }

  /**
   * Affiche une confirmation avant action avec des messages personnalisés
   */
  private confirmerAction(message: string): boolean {
    return confirm(message);
  }

  /**
   * ✅ Confirmation personnalisée pour la réinitialisation de mot de passe
   */
  private confirmerResetMotDePasse(nomUtilisateur: string): boolean {
    return confirm(`⚠️ ATTENTION ⚠️\n\nVoulez-vous vraiment réinitialiser le mot de passe de ${nomUtilisateur} ?\n\n• Cette action est irréversible\n• L'utilisateur devra utiliser le nouveau mot de passe\n• Une notification sera envoyée automatiquement\n\nConfirmer la réinitialisation ?`);
  }

  /**
   * ✅ Confirmation personnalisée pour l'activation/désactivation
   */
  private confirmerToggleActivation(nomUtilisateur: string, action: string): boolean {
    const actionText = action === 'désactiver' ? 
      '🔒 DÉSACTIVATION' : 
      '✅ RÉACTIVATION';
    
    const warningText = action === 'désactiver' ? 
      '• L\'utilisateur ne pourra plus se connecter\n• Ses sessions actives seront fermées\n• Ses permissions seront suspendues' :
      '• L\'utilisateur pourra à nouveau se connecter\n• Ses permissions seront restaurées\n• Il recevra une notification de réactivation';

    return confirm(`${actionText}\n\nUtilisateur : ${nomUtilisateur}\n\n${warningText}\n\nConfirmer cette action ?`);
  }

  /**
   * Affiche une notification de succès
   */
  private afficherNotificationSucces(message: string): void {
    // Vous pouvez intégrer ici un service de notification
    // Pour l'instant, on utilise console.log et alert
    console.log('✅ SUCCESS:', message);
    
    // Optionnel : utiliser un toast/snackbar
    // this.notificationService.success(message);
    
    // Temporaire : alert simple
    alert('✅ ' + message);
  }

  /**
   * Affiche une notification d'erreur
   */
  private afficherNotificationErreur(message: string): void {
    // Vous pouvez intégrer ici un service de notification
    console.error('❌ ERROR:', message);
    
    // Optionnel : utiliser un toast/snackbar
    // this.notificationService.error(message);
    
    // Temporaire : alert simple
    alert('❌ ' + message);
  }

  /**
   * ✅ Méthodes pour les statistiques et helpers
   */

  /**
   * Retourne la couleur du badge selon le rôle
   */
  getBadgeRoleClass(role: string): string {
    switch (role) {
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
   * Retourne la couleur du badge selon le statut
   */
  getBadgeStatutClass(actif: boolean): string {
    return actif 
      ? 'bg-emerald-100 text-emerald-800' 
      : 'bg-red-100 text-red-800';
  }

  /**
   * Retourne les initiales d'un utilisateur
   */
  getUserInitials(user: any): string {
    if (!user || !user.nom || !user.prenom) return '??';
    return (user.nom[0] + user.prenom[0]).toUpperCase();
  }

  /**
   * Formate une date pour l'affichage
   */
  formatDate(date: string | Date): string {
    if (!date) return 'Date inconnue';
    
    try {
      const dateObj = new Date(date);
      return dateObj.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('❌ Erreur formatage date :', error);
      return 'Date invalide';
    }
  }

  /**
   * Vérifie si un utilisateur peut être modifié
   */
  peutEtreModifie(user: any): boolean {
    return user && user.id && user.role !== 'ADMIN';
  }

  /**
   * Vérifie si l'utilisateur actuel est admin
   */
  private estAdmin(): boolean {
    const token = localStorage.getItem('access-token');
    if (!token) return false;

    try {
      const payload = token.split('.')[1];
      const decodedPayload = atob(payload);
      const decoded = JSON.parse(decodedPayload);
      return decoded.scope === 'ADMIN';
    } catch (e) {
      console.error('❌ Erreur vérification admin :', e);
      return false;
    }
  }

  /**
   * ✅ Méthodes de cycle de vie et nettoyage
   */

  /**
   * Rafraîchit toutes les données du dashboard
   */
  rafraichirDonnees(): void {
    console.log('🔄 Rafraîchissement des données...');
    this.chargerDonnees();
  }

  /**
   * Exporte la liste des utilisateurs (optionnel)
   */
  exporterUtilisateurs(): void {
    console.log('📤 Export des utilisateurs...');
    // Implémentation de l'export en CSV ou Excel
    // this.exportService.exporterCSV(this.utilisateurs, 'utilisateurs.csv');
  }

  /**
   * Recherche dans la liste des utilisateurs (optionnel)
   */
  rechercherUtilisateur(terme: string): void {
    console.log('🔍 Recherche utilisateur :', terme);
    // Implémentation de la recherche/filtrage
    // this.utilisateursFiltres = this.utilisateurs.filter(u => 
    //   u.nom.toLowerCase().includes(terme.toLowerCase()) ||
    //   u.prenom.toLowerCase().includes(terme.toLowerCase()) ||
    //   u.email.toLowerCase().includes(terme.toLowerCase())
    // );
  }

  /**
   * Cleanup lors de la destruction du composant
   */
  ngOnDestroy(): void {
    // Nettoyer les subscriptions si nécessaire
    console.log('🧹 Nettoyage du composant dashboard admin');
  }
}