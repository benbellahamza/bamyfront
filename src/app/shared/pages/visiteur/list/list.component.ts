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
  }

  loadVisiteurs() {
    this.visiteurService.getVisiteursDuJour().subscribe(data => {
      this.visiteursDuJour = data;
    });
  }

  validerSortie(id: number) {
    this.visiteurService.validerSortie(id).subscribe(() => {
      this.loadVisiteurs(); // Recharge la liste après validation
    });
  }

}
