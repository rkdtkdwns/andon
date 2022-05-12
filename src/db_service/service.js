import {postPDSSQL, postSQL} from "./api";


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

export const fetchManufacturingStatus = async () => {
    let sql = `
        SELECT
              PA.description AS '품명'
            , CONVERT(numeric(13, 0) ,  dbo.raMVNumeric(POI.quantity) ) AS '목표생산'
            , dbo.raMVUoM(POI.quantity) AS UOM
            , UDA_P.PART_DISPO_CUSTOM_S AS MRP
            , '-' AS LINE
        FROM PROCESS_ORDER_ITEM AS POI
            INNER JOIN PROCESS_ORDER AS PO
                    ON PO.order_key = POI.order_key
            INNER JOIN OBJECT_STATE AS POI_OBJECT_STATE
                    ON POI.order_item_key = POI_OBJECT_STATE.object_key
                       AND POI_OBJECT_STATE.object_type = 112
            INNER JOIN STATE AS POI_STATE
                    ON POI_OBJECT_STATE.state_key = POI_STATE.state_key
            INNER JOIN PART AS PA
                    ON PA.part_number = POI.part_number
            INNER JOIN UDA_Part AS UDA_P
                    ON PA.part_key = UDA_P.object_key
            INNER JOIN OBJECT_STATE_HISTORY as ST_TIME
                ON PO.order_key = ST_TIME.object_key
            WHERE POI_STATE.state_name IN( 'Running', 'Completing' )
                AND ST_TIME.transition_name = 'Start'
                AND ST_TIME.state_name = 'Running'
                AND UDA_P.part_dispo_custom_s IN('M01', 'M02', 'M03', 'M04', 'M05', 'M06', 'M07', 'M08', 'M09', 'M10')
                AND CONVERT(CHAR(10), ST_TIME.entry_time, 23) = CONVERT(CHAR(10), GETDATE(), 23)
            ORDER BY ST_TIME.entry_time desc , MRP
    `
    return postPDSSQL(sql)
}
