import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-responsable-visiteur',
  standalone: false,
  templateUrl: './responsable-visiteur.component.html',
  styleUrls: ['./responsable-visiteur.component.css']
})
export class ResponsableVisiteurComponent implements OnInit {

  visiteurs: any[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.getVisiteurs();
  }

  getVisiteurs() {
    this.http.get<any[]>('http://localhost:8085/api/visiteurs')
      .subscribe(data => {
        this.visiteurs = data;
      });
  }

}
