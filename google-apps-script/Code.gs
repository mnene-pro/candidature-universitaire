const SHEET_NAME = "Candidatures";

function doGet() {
  return output({success:true, message:"API candidature active"});
}

function doPost(e) {
  try {
    const data = JSON.parse(e.parameter.payload);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME)
      || SpreadsheetApp.getActiveSpreadsheet().insertSheet(SHEET_NAME);

    const headers = [
      "Date","Référence","Nom","Prénom","Email","Téléphone","Pays","Université",
      "Site université","Domaine","Niveau","Diplôme","Année","Établissement",
      "Moyenne","Motivation","Consentement"
    ];

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
      sheet.getRange(1,1,1,headers.length).setFontWeight("bold");
      sheet.setFrozenRows(1);
    }

    sheet.appendRow([
      new Date(), data.reference, data.nom, data.prenom, data.email,
      data.telephone, data.pays, data.universite, data.universite_site,
      data.domaine, data.niveau, data.diplome, data.anneeDiplome,
      data.etablissement, data.moyenne, data.motivation, data.consentement
    ]);

    return output({success:true, reference:data.reference});
  } catch (error) {
    return output({success:false, message:String(error)});
  }
}

function output(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
