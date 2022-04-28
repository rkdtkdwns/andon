import {postSQL} from "./api";


export const fetchMachines = async () => {
    let sql = `
        SELECT *
        FROM TagMaster
        ORDER BY ProdLine, TagIndex`;
    return postSQL(sql);
};

export const fetchTagHistory = async (prodLine, tagIndex, start, end) => {
    let sql = `
        SELECT DateAndTime, Millitm, Val
        FROM HARIM_MES_DW.dbo.FloatTable_DM t
        WHERE ProdLine = '${prodLine}' and 
              TagIndex = '${tagIndex}' and
              DateAndTime between '${start}' and '${end}'
        ORDER BY DateAndTime
    `;
    return postSQL(sql)
};

export const fetchTagStats = async (prodLine, tagIndex, start, end) => {
    let sql = `
        select
        stdev(Val) as stdev,
        avg(Val) as mean,
        count(*) as total_count,
        max(Val) as max, min(Val) as min
        from FloatTable_DM
        where ProdLine = '${prodLine}' and 
              TagIndex = '${tagIndex}' and 
              DateAndTime between '${start}' and '${end}'
    `;
    return postSQL(sql)
};
