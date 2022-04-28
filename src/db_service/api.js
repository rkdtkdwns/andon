import {create} from "apisauce";

let url = 'http://localhost:3000/api/v1';

if(process.env.NODE_ENV === 'production'){
    url = 'http://172.21.6.251/api/v1';
}

const api = create({
    baseURL: url,
});

export const postSQL = async (sql) => {
    let res = await api.post('mssql', {sql: sql});
    console.log(res);
    return res
};
