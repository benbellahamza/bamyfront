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
  loading: boolean = false;
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
}
