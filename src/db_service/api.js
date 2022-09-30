import {create} from "apisauce";

let url = 'http://localhost:3001/api/v1';

if(process.env.NODE_ENV === 'production'){
    url = 'http://172.21.6.251/api/v1';
}

const api = create({
    baseURL: url,
});

export const postSQL = async (sql, dbName) => {
    let res = await api.post('dw', {sql: sql, db_name: dbName});
    console.log(res);
    return res
};

export const postPDSSQL = async (sql) => {
    let res = await api.post('pds', {sql: sql});
    console.log(res);
    return res
}
