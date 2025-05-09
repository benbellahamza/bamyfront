import { Component, OnInit } from '@angular/core';
import { HistoriqueService } from 'app/core/services/historique/historique.service';

@Component({
  selector: 'app-historique-activite',
  standalone: false,
  templateUrl: './historique-activite.component.html',
  styleUrls: ['./historique-activite.component.css']
})
export class HistoriqueActiviteComponent implements OnInit {
  historique: any[] = [];

  filtreTexte: string = '';
  filtreDate: string = ''; // format : 'YYYY-MM'
utilisateur: any;

  constructor(private historiqueService: HistoriqueService) {}

  ngOnInit(): void {
    this.chargerHistorique();
  }

  chargerHistorique(): void {
    this.historiqueService.getHistorique().subscribe({
      next: (res) => {
        console.log("✅ Historique chargé :", res);
        this.historique = res;
      },
      error: (err) => {
        console.error('❌ Erreur lors du chargement de l’historique :', err);
        this.historique = [];
      }
    });
  }

  historiqueFiltre(): any[] {
    return this.historique.filter(action => {
      const texte = this.filtreTexte.toLowerCase();
      const dateMois = this.filtreDate;

      const matchTexte =
        action.agent.toLowerCase().includes(texte) ||
        action.action.toLowerCase().includes(texte);

      const matchDate = dateMois
        ? new Date(action.dateAction).toISOString().slice(0, 7) === dateMois
        : true;

      return matchTexte && matchDate;
    });
  }
}
