import { Component, OnInit, OnDestroy } from '@angular/core';
import { VisiteurService } from 'app/core/services/visiteur/visiteur.service';

interface Visiteur {
  id: number;
  nom: string;
  prenom: string;
  cin: string;
  telephone: string;
  typeVisiteur: string | null;
  destination: string;
  dateEntree: string | Date;
  dateSortie: string | Date | null;
  genre?: string;
  matricule?: string;
}

@Component({
  selector: 'app-list',
  standalone: false,
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.css']
})
export class ListComponent implements OnInit, OnDestroy {
  visiteursDuJour: Visiteur[] = [];
  filteredVisiteurs: Visiteur[] = [];
  loading: boolean = false;
  
  // Variables pour les filtres
  searchText: string = '';
  typeFilter: string = 'all';
  statusFilter: string = 'all';
  
  private refreshListener: any;

  constructor(private visiteurService: VisiteurService) {}

  ngOnInit(): void {
    this.loadVisiteurs();
    this.refreshListener = () => {
      console.log("🔄 Rechargement demandé par event refresh-visiteurs");
      this.loadVisiteurs();
    };
    
    window.addEventListener('refresh-visiteurs', this.refreshListener);
  }

  ngOnDestroy(): void {
    // Nettoyage des écouteurs d'événements
    if (this.refreshListener) {
      window.removeEventListener('refresh-visiteurs', this.refreshListener);
    }
  }

  /**
   * Récupère les visiteurs du jour avec indicateur de chargement
   */
  loadVisiteurs() {
    this.loading = true;
    
    this.visiteurService.getVisiteursDuJour().subscribe({
      next: (data) => {
        this.visiteursDuJour = data.sort((a, b) =>
          new Date(b.dateEntree).getTime() - new Date(a.dateEntree).getTime()
        );
        this.filterVisiteurs(); // Applique les filtres sur les données chargées
        console.log("✅ Visiteurs du jour mis à jour :", this.visiteursDuJour);
        this.loading = false;
      },
      error: (err) => {
        console.error('❌ Erreur lors du chargement des visiteurs:', err);
        this.loading = false;
      }
    });
  }

  /**
   * Filtre les visiteurs selon les critères
   */
  filterVisiteurs() {
    const searchLower = this.searchText ? this.searchText.toLowerCase() : '';
    
    this.filteredVisiteurs = this.visiteursDuJour.filter(v => {
      // Filtre de recherche textuelle
      const matchSearch = !searchLower || 
                          v.nom.toLowerCase().includes(searchLower) || 
                          v.prenom.toLowerCase().includes(searchLower) ||
                          v.cin.toLowerCase().includes(searchLower) ||
                          v.telephone.toLowerCase().includes(searchLower) ||
                          (v.destination && v.destination.toLowerCase().includes(searchLower));
      
      // Filtre par type de visiteur
      const matchType = this.typeFilter === 'all' || 
                        (v.typeVisiteur && v.typeVisiteur.toLowerCase() === this.typeFilter.toLowerCase());
      
      // Filtre par statut (présent/sorti)
      const matchStatus = this.statusFilter === 'all' ||
                         (this.statusFilter === 'present' && !v.dateSortie) ||
                         (this.statusFilter === 'sorti' && v.dateSortie);
      
      return matchSearch && matchType && matchStatus;
    });
  }

  /**
   * Vérifie s'il y a des filtres actifs
   */
  hasActiveFilters(): boolean {
    return this.searchText !== '' || 
           this.typeFilter !== 'all' || 
           this.statusFilter !== 'all';
  }

  /**
   * Réinitialise tous les filtres et recharge toutes les données
   */
  resetFilters() {
    this.searchText = '';
    this.typeFilter = 'all';
    this.statusFilter = 'all';
    this.loadVisiteurs(); // Recharge toutes les données depuis le serveur
  }

  /**
   * Efface seulement la recherche
   */
  clearSearch() {
    this.searchText = '';
    this.filterVisiteurs();
  }

  /**
   * Compte le nombre de visiteurs présents
   */
  getPresentsCount(): number {
    return this.visiteursDuJour.filter(v => !v.dateSortie).length;
  }

  /**
   * Compte le nombre de visiteurs sortis
   */
  getSortisCount(): number {
    return this.visiteursDuJour.filter(v => v.dateSortie).length;
  }

  /**
   * Valide la sortie du visiteur
   */
  validerSortie(id: number) {
    this.visiteurService.validerSortie(id).subscribe({
      next: () => {
        this.loadVisiteurs();
        console.log('✅ Sortie validée avec succès');
      },
      error: (err) => {
        console.error('❌ Erreur lors de la validation de la sortie:', err);
      }
    });
  }

  /**
   * Transmet les données du visiteur pour modification
   */
  modifierVisiteur(visiteur: Visiteur) {
    const event = new CustomEvent('edit-visiteur', { detail: visiteur });
    window.dispatchEvent(event);
    console.log('📝 Édition du visiteur:', visiteur.nom, visiteur.prenom);
  }
  
  /**
   * Calcule la durée de présence du visiteur
   */
  calculerDuree(dateEntree: string | Date): string {
    const entree = new Date(dateEntree);
    const maintenant = new Date();
    const diff = maintenant.getTime() - entree.getTime();
    
    // Calcul des heures et minutes
    const heures = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (heures === 0) {
      return `${minutes} min`;
    } else if (heures < 24) {
      return `${heures}h ${minutes}min`;
    } else {
      const jours = Math.floor(heures / 24);
      const heuresRestantes = heures % 24;
      return `${jours}j ${heuresRestantes}h`;
    }
  }

  /**
   * Formate une date pour l'affichage
   */
  formatDate(date: string | Date): string {
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Retourne la couleur du badge selon le statut
   */
  getStatusColor(visiteur: Visiteur): string {
    if (visiteur.dateSortie) {
      return 'bg-green-100 text-green-800';
    }
    
    // Calcul de la durée pour déterminer la couleur
    const entree = new Date(visiteur.dateEntree);
    const maintenant = new Date();
    const heures = Math.floor((maintenant.getTime() - entree.getTime()) / (1000 * 60 * 60));
    
    if (heures < 2) {
      return 'bg-blue-100 text-blue-800'; // Récent
    } else if (heures < 4) {
      return 'bg-yellow-100 text-yellow-800'; // Modéré
    } else {
      return 'bg-orange-100 text-orange-800'; // Long
    }
  }

  /**
   * Retourne l'icône appropriée selon la destination
   */
  getDestinationIcon(destination: string): string {
    switch (destination?.toLowerCase()) {
      case 'atelier':
        return '🔧';
      case 'administration':
        return '🏢';
      case 'réception':
        return '📋';
      case 'comptoir':
        return '💼';
      default:
        return '📍';
    }
  }

  /**
   * Retourne l'icône appropriée selon le type de visiteur
   */
  getTypeIcon(type: string | null): string {
    if (!type) return '👤';
    
    switch (type.toLowerCase()) {
      case 'client':
        return '👤';
      case 'prestataire/fournisseur':
      case 'prestataire':
      case 'fournisseur':
        return '🤝';
      default:
        return '👤';
    }
  }

  /**
   * Méthode utilitaire pour déboguer
   */
  debugVisiteur(visiteur: Visiteur) {
    console.log('🔍 Debug visiteur:', {
      id: visiteur.id,
      nom: visiteur.nom,
      prenom: visiteur.prenom,
      statut: visiteur.dateSortie ? 'Sorti' : 'Présent',
      duree: this.calculerDuree(visiteur.dateEntree)
    });
  }
}