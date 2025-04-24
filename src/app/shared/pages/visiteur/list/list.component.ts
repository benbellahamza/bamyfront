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

    // 🔁 Écoute des mises à jour depuis form.component.ts
    window.addEventListener('refresh-visiteurs', () => {
      this.loadVisiteurs();
    });
  }

  loadVisiteurs() {
    this.visiteurService.getVisiteursDuJour().subscribe(data => {
      this.visiteursDuJour = data.sort((a, b) =>
        new Date(b.dateEntree).getTime() - new Date(a.dateEntree).getTime()
      );
    });
  }

  validerSortie(id: number) {
    this.visiteurService.validerSortie(id).subscribe(() => {
      this.loadVisiteurs();
    });
  }

  supprimerVisiteur(id: number) {
    if (confirm("Voulez-vous vraiment supprimer ce visiteur ?")) {
      this.visiteurService.supprimer(id).subscribe(() => {
        this.loadVisiteurs();
        // ✅ Mise à jour du compteur côté form
        window.dispatchEvent(new CustomEvent('refresh-compteur'));
      });
    }
  }

  modifierVisiteur(visiteur: any) {
    const event = new CustomEvent('edit-visiteur', { detail: visiteur });
    window.dispatchEvent(event); // 🔁 Envoie vers FormComponent
  }
}
