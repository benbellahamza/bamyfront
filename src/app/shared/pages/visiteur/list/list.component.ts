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
    
    // Réinitialise les filtres à chaque actualisation
    this.resetFilters();
    
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
   * Réinitialise tous les filtres
   */
  resetFilters() {
    this.searchText = '';
    this.typeFilter = 'all';
    this.statusFilter = 'all';
    this.filterVisiteurs();
  }

  /**
   * Valide la sortie du visiteur
   */
  validerSortie(id: number) {
    this.visiteurService.validerSortie(id).subscribe({
      next: () => {
        this.loadVisiteurs();
      },
      error: (err) => {
        console.error('Erreur lors de la validation de la sortie:', err);
      }
    });
  }

  /**
   * Supprime un visiteur
   */
  supprimerVisiteur(id: number) {
    if (confirm("❗ Voulez-vous vraiment supprimer ce visiteur ?")) {
      this.visiteurService.supprimer(id).subscribe({
        next: () => {
          this.loadVisiteurs();
          // Informe le FormComponent de mettre à jour le compteur
          window.dispatchEvent(new CustomEvent('refresh-compteur'));
        },
        error: (err) => {
          console.error('Erreur lors de la suppression:', err);
        }
      });
    }
  }

  /**
   * Transmet les données du visiteur pour modification
   */
  modifierVisiteur(visiteur: Visiteur) {
    const event = new CustomEvent('edit-visiteur', { detail: visiteur });
    window.dispatchEvent(event);
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
    } else {
      return `${heures}h ${minutes}min`;
    }
  }
}