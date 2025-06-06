import { Component, OnInit } from '@angular/core';
import { LivraisonService } from 'app/core/services/livraison/livraison.service';
import { HttpClient } from '@angular/common/http';
import { AuthService } from 'app/core/services/auth/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-ajouter-livraison',
  standalone: false,
  templateUrl: './ajouter-livraison.component.html',
  styleUrls: ['./ajouter-livraison.component.css']
})
export class AjouterLivraisonComponent implements OnInit {

  // ✅ Configuration de la navigation (vide car pas de sidebar spécifique)
  navigationItems: any[] = [];

  // 🚛 Données spécifiques aux livraisons
  entreeCamion = {
    numeroChassis: '',
    marque: '',
    modele: '',
    nomChauffeur: '',
    prenomChauffeur: ''
  };

  // 🔍 Recherche et sortie camion
  numeroRecherche = '';
  camionTrouve: any = null;
  sortieCamion = {
    destination: '',
    nomChauffeurSortie: '',
    prenomChauffeurSortie: '',
    cinChauffeurSortie: '',
    entreprise: ''
  };

  constructor(
    private livraisonService: LivraisonService,
    private authService: AuthService,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Initialisation du composant
  }

  // ✅ Callback appelé après changement de mot de passe via le composant unifié
  onPasswordChanged(): void {
    console.log('🔐 Mot de passe changé avec succès depuis ajouter livraison');
    this.showNotification('Mot de passe mis à jour avec succès !');
  }

  // 🚛 Enregistrement d'une entrée de camion
  enregistrerEntree(): void {
    if (!this.validateEntreeForm()) {
      this.showErrorNotification('Veuillez remplir tous les champs obligatoires');
      return;
    }

    this.livraisonService.enregistrerEntree(this.entreeCamion).subscribe({
      next: (response) => {
        console.log('✅ Camion enregistré avec succès', response);
        this.showNotification('Camion enregistré avec succès');
        this.resetEntreeForm();
        this.refreshLivraisonList();
      },
      error: (error) => {
        console.error('❌ Erreur lors de l\'enregistrement', error);
        this.showErrorNotification('Erreur lors de l\'enregistrement du camion');
      }
    });
  }

  // 🔍 Recherche d'un camion
  rechercherCamion(): void {
    if (!this.numeroRecherche.trim()) {
      this.showErrorNotification('Veuillez saisir un numéro de chassis');
      return;
    }

    this.livraisonService.rechercherCamion(this.numeroRecherche).subscribe({
      next: (data) => {
        this.camionTrouve = data;
        console.log('🔍 Camion trouvé:', data);
        this.showNotification('Camion trouvé avec succès');
      },
      error: (error) => {
        this.camionTrouve = null;
        console.error('🚫 Camion non trouvé', error);
        this.showErrorNotification('Camion non trouvé');
      }
    });
  }

  // 🚚 Enregistrement d'une sortie de camion
  enregistrerSortie(): void {
    if (!this.validateSortieForm()) {
      this.showErrorNotification('Veuillez remplir tous les champs obligatoires');
      return;
    }

    this.livraisonService.enregistrerSortie(this.numeroRecherche, this.sortieCamion).subscribe({
      next: (response) => {
        console.log('✅ Sortie enregistrée avec succès', response);
        this.showNotification('Sortie enregistrée avec succès');
        this.resetSortieForm();
        this.refreshLivraisonList();
      },
      error: (error) => {
        console.error('❌ Erreur lors de l\'enregistrement de la sortie', error);
        this.showErrorNotification('Erreur lors de l\'enregistrement de la sortie');
      }
    });
  }

  // ✅ Validation du formulaire d'entrée
  private validateEntreeForm(): boolean {
    return !!(
      this.entreeCamion.numeroChassis?.trim() &&
      this.entreeCamion.marque?.trim() &&
      this.entreeCamion.modele?.trim() &&
      this.entreeCamion.nomChauffeur?.trim() &&
      this.entreeCamion.prenomChauffeur?.trim()
    );
  }

  // ✅ Validation du formulaire de sortie
  private validateSortieForm(): boolean {
    return !!(
      this.numeroRecherche?.trim() &&
      this.sortieCamion.destination?.trim() &&
      this.sortieCamion.nomChauffeurSortie?.trim() &&
      this.sortieCamion.prenomChauffeurSortie?.trim() &&
      this.sortieCamion.cinChauffeurSortie?.trim() &&
      this.sortieCamion.entreprise?.trim()
    );
  }

  // 🧹 Réinitialisation du formulaire d'entrée
  private resetEntreeForm(): void {
    this.entreeCamion = {
      numeroChassis: '',
      marque: '',
      modele: '',
      nomChauffeur: '',
      prenomChauffeur: ''
    };
  }

  // 🧹 Réinitialisation du formulaire de sortie
  private resetSortieForm(): void {
    this.numeroRecherche = '';
    this.camionTrouve = null;
    this.sortieCamion = {
      destination: '',
      nomChauffeurSortie: '',
      prenomChauffeurSortie: '',
      cinChauffeurSortie: '',
      entreprise: ''
    };
  }

  // 🔄 Rafraîchissement de la liste des livraisons
  refreshLivraisonList(): void {
    // Émission d'un événement pour rafraîchir la liste
    // Vous pouvez utiliser un service partagé ou un EventEmitter
    console.log('🔄 Rafraîchissement de la liste des livraisons');
  }

  // 💬 Affichage des notifications de succès
  private showNotification(message: string): void {
    const notification = document.createElement('div');
    notification.className = 'fixed top-20 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fadeIn';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  // 💬 Affichage des notifications d'erreur
  private showErrorNotification(message: string): void {
    const notification = document.createElement('div');
    notification.className = 'fixed top-20 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fadeIn';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  // 🎯 Navigation vers d'autres pages
  goToLivraisonList(): void {
    this.router.navigate(['/livraisons']);
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  // 🔄 Rafraîchissement de la page
  refresh(): void {
    window.location.reload();
  }

  // 📊 Gestion des erreurs globales
  handleError(error: any): void {
    console.error('❌ Erreur dans ajouter-livraison:', error);
    this.showErrorNotification('Une erreur est survenue');
  }

  // 🚛 Méthodes utilitaires spécifiques aux livraisons
  getCamionDetails(): any {
    return this.camionTrouve;
  }

  isCamionFound(): boolean {
    return !!this.camionTrouve;
  }

  clearSearch(): void {
    this.numeroRecherche = '';
    this.camionTrouve = null;
  }

  // 📈 Statistiques (si nécessaire)
  getStatistiques(): any {
    return {
      entreesToday: 0, // À implémenter selon vos besoins
      sortesToday: 0,
      camionsPresents: 0
    };
  }

  // 🎨 Méthodes d'affichage
  formatCamionInfo(camion: any): string {
    if (!camion) return '';
    return `${camion.marque} ${camion.modele} - ${camion.numeroChassis}`;
  }

  // 💾 Sauvegarde rapide
  quickSave(): void {
    console.log('💾 Sauvegarde rapide des données de livraison');
    // Logique de sauvegarde automatique si nécessaire
  }

  // 🔍 Recherche avancée
  advancedSearch(criteria: any): void {
    console.log('🔍 Recherche avancée:', criteria);
    // Logique de recherche avancée
  }
}