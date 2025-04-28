import { Component, OnInit } from '@angular/core';
import { VisiteurService } from 'app/core/services/visiteur/visiteur.service';

@Component({
  selector: 'app-list',
  standalone: false,
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.css']
})
export class ListComponent implements OnInit {

  visiteursDuJour: any[] = [];

  constructor(private visiteurService: VisiteurService) {}

  ngOnInit(): void {
    this.loadVisiteurs();

    // 🔁 Si un ajout ou modification est fait depuis le FormComponent
    window.addEventListener('refresh-visiteurs', () => {
      this.loadVisiteurs();
    });
  }

  /**
   * ✅ Récupère les visiteurs du jour (triés par date décroissante)
   */
  loadVisiteurs() {
    this.visiteurService.getVisiteursDuJour().subscribe(data => {
      this.visiteursDuJour = data.sort((a, b) =>
        new Date(b.dateEntree).getTime() - new Date(a.dateEntree).getTime()
      );
    });
  }

  /**
   * ✅ Valide la sortie du visiteur (date + heure actuelles)
   */
  validerSortie(id: number) {
    this.visiteurService.validerSortie(id).subscribe(() => {
      this.loadVisiteurs();
    });
  }

  /**
   * ✅ Supprime un visiteur avec confirmation et met à jour le compteur
   */
  supprimerVisiteur(id: number) {
    if (confirm("❗ Voulez-vous vraiment supprimer ce visiteur ?")) {
      this.visiteurService.supprimer(id).subscribe(() => {
        this.loadVisiteurs();

        // 🔁 Informe le FormComponent de mettre à jour le compteur
        window.dispatchEvent(new CustomEvent('refresh-compteur'));
      });
    }
  }

  /**
   * ✅ Transmet les données du visiteur à FormComponent (pour modification)
   */
  modifierVisiteur(visiteur: any) {
    const event = new CustomEvent('edit-visiteur', { detail: visiteur });
    window.dispatchEvent(event);
  }
}