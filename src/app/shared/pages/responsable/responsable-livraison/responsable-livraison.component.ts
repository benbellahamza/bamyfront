import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

interface Camion {
  id?: number;
  marque: string;
  modele: string;
  numeroChassis: string;
  
  // CHAUFFEUR D'ENTRÉE - Structure correcte
  chauffeurEntree?: {
    id: number;
    nom: string;
    prenom?: string;
  };
  
  // Pour la rétrocompatibilité
  nomChauffeur?: string;
  prenomChauffeur?: string;
  
  dateEntree?: string;
  dateSortie?: string;
  destination?: string;
  statut?: 'ENTREE' | 'SORTIE';
  dateEntreeFormatee?: string;
  dateSortieFormatee?: string;
}

@Component({
  selector: 'app-responsable-livraison',
  standalone: false,
  templateUrl: './responsable-livraison.component.html',
  styleUrls: ['./responsable-livraison.component.css']
})
export class ResponsableLivraisonComponent implements OnInit {
  camions: Camion[] = [];
  camionsFiltres: Camion[] = [];
  filtreStatut: 'TOUS' | 'ENTREE' | 'SORTIE' = 'TOUS';
  loading: boolean = false;

  // Messages de feedback
  messageSuccess: string = '';
  messageErreur: string = '';

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.chargerCamions();
  }

  /**
   * Gestionnaire pour le changement de mot de passe depuis le layout unifié
   */
  onPasswordChanged(): void {
    console.log('✅ Mot de passe changé avec succès depuis le layout unifié');
    // Vous pouvez ajouter ici toute logique supplémentaire nécessaire
    // après un changement de mot de passe réussi
  }

  chargerCamions(): void {
    this.loading = true;
    this.http.get<Camion[]>('http://localhost:8085/api/livraison/all').subscribe({
      next: (data) => {
        this.camions = data.map(camion => {
          // 🔧 Mapping correct des données du chauffeur
          const nomChauffeur = camion.chauffeurEntree?.nom || camion.nomChauffeur || '';
          const prenomChauffeur = camion.chauffeurEntree?.prenom || camion.prenomChauffeur || '';

          return {
            ...camion,
            // Ajouter les propriétés mappées pour la rétrocompatibilité
            nomChauffeur,
            prenomChauffeur,
            statut: (camion.dateSortie ? 'SORTIE' : 'ENTREE') as 'ENTREE' | 'SORTIE',
            dateEntreeFormatee: this.formatDate(camion.dateEntree),
            dateSortieFormatee: camion.dateSortie ? this.formatDate(camion.dateSortie) : ''
          };
        }).sort((a, b) => new Date(b.dateEntree || '').getTime() - new Date(a.dateEntree || '').getTime());
        
        console.log('Camions après mapping (responsable):', this.camions);
        this.appliquerFiltre();
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur chargement camions', err);
        this.messageErreur = '❌ Erreur lors du chargement des camions.';
        setTimeout(() => this.messageErreur = '', 3000);
        this.loading = false;
      }
    });
  }

  appliquerFiltre(): void {
    if (this.filtreStatut === 'TOUS') {
      this.camionsFiltres = this.camions;
    } else {
      this.camionsFiltres = this.camions.filter(c => c.statut === this.filtreStatut);
    }
  }

  getCamionsByStatut(statut: 'ENTREE' | 'SORTIE'): Camion[] {
    return this.camions.filter(c => c.statut === statut);
  }

  filtrerParStatut(statut: 'TOUS' | 'ENTREE' | 'SORTIE') {
    this.filtreStatut = statut;
    this.appliquerFiltre();
  }

  enregistrerSortie(camion: Camion): void {
    if (confirm(`Voulez-vous vraiment enregistrer la sortie du camion ${camion.numeroChassis} ?`)) {
      const payload = {
        nomChauffeurSortie: camion.nomChauffeur || '',
        prenomChauffeurSortie: camion.prenomChauffeur || '',
        cinChauffeurSortie: 'CIN_PLACEHOLDER' // à récupérer ou ajouter dans le formulaire
      };

      this.http.post(`http://localhost:8085/api/livraison/sortie/${camion.numeroChassis}`, payload).subscribe({
        next: () => {
          this.chargerCamions();
          // Afficher un message de succès
          this.messageSuccess = `✅ Sortie du camion ${camion.numeroChassis} enregistrée avec succès.`;
          setTimeout(() => this.messageSuccess = '', 3000);
        },
        error: (err) => {
          console.error('Erreur lors de la sortie du camion', err);
          this.messageErreur = `❌ Erreur lors de l'enregistrement de la sortie du camion ${camion.numeroChassis}.`;
          setTimeout(() => this.messageErreur = '', 3000);
        }
      });
    }
  }

  naviguerVersAjout(): void {
    this.router.navigate(['/agent/ajouterLivraison']);
  }

  private formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '';
    
    try {
      const date = new Date(dateStr);
      
      if (isNaN(date.getTime())) {
        return 'Date invalide';
      }
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch (e) {
      return 'Erreur de date';
    }
  }
}