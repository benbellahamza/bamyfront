import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CompteurVisiteService {
  private apiUrl = 'http://localhost:8085/api/compteur'; // ✅ adapte au besoin si ton URL backend est différente

  constructor(private http: HttpClient) {}

  getCompteur(): Observable<number> {
    return this.http.get<number>(this.apiUrl);
  }
}
