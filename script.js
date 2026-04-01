let data=null;

async function loadData(){
  if(data) return data;
  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxvi5Fc5J9x2MWfV587SusaC6gOp2fgOuEI78qEv0kMK-RvW6LCRi5qEj-parCMJSTK/exec"; // вставьте сюда свой
  try{
    const res = await fetch(SCRIPT_URL);
    data = await res.json();
  }catch(e){
    console.error(e);
  }
}
