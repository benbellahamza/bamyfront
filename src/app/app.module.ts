import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NavbarComponent } from './shared/components/navbar/navbar/navbar.component';
import { FooterComponent } from './shared/components/footer/footer/footer.component';
import { FormComponent } from './shared/pages/visiteur/form/form.component';
import { ListComponent } from './shared/pages/visiteur/list/list.component';
import { LoginComponent } from './core/auth/login/login.component';
import { LivraisonFormComponent } from './shared/pages/livraison/livraison-form/livraison-form.component';
import { LivraisonListComponent } from './shared/pages/livraison/livraison-list/livraison-list.component';
import { DashboardAgentComponent } from './shared/pages/agent/dashboard-agent/dashboard-agent.component';
import { DashboardAdminComponent } from './shared/pages/admin/dashboard-admin/dashboard-admin.component';
import { AjouterUtilisateurComponent } from './shared/pages/admin/ajouter-utilisateur/ajouter-utilisateur.component';
import { ResponsableVisiteurComponent } from './shared/pages/responsable/responsable-visiteur/responsable-visiteur.component';
import { ResponsableLivraisonComponent } from './shared/pages/responsable/responsable-livraison/responsable-livraison.component';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http'; // ✅ à importer ici

@NgModule({
  declarations: [
    AppComponent,
    NavbarComponent,
    FooterComponent,
    FormComponent,
    ListComponent,
    LoginComponent,
    LivraisonFormComponent,
    LivraisonListComponent,
    DashboardAgentComponent,
    DashboardAdminComponent,
    AjouterUtilisateurComponent,
    ResponsableVisiteurComponent,
    ResponsableLivraisonComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule,
    HttpClientModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
