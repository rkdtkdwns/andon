import {postPDSSQL, postSQL} from "./api";
import Moment from "moment";


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

export const fetchManufacturingStatus = async (lineType, MRPType) => {
    let sql = `
    SELECT * FROM (
        SELECT
            LINE.PO_NUMBER_S,
            LINE.PART_NAME_S AS PART_NAME
            , CAST(LINE.PLANNED_QTY_S AS INT)  AS PLANNED
            , LINE.UOM_S AS UOM
            , LINE.MRP_CODE_S AS MRP
            , db_name AS DB_NAME
            , tag_index AS TAG_INDEX
            , TAG_TABLE
            , LINE_DETAIL_S
            , LINE_NUMBER_I
            , PO.order_number AS ORDER_NUM
        FROM PROCESS_ORDER_ITEM AS POI
            INNER JOIN PROCESS_ORDER AS PO
                ON PO.order_key = POI.order_key
            INNER JOIN AT_RA_ADN_LineInfo AS LINE
                ON LINE.PO_NUMBER_S= POI.order_item_name
            INNER JOIN AT_RA_ADN_LineInfo_TAG as LINE_TAG
                ON LINE_TAG.atr_key = LINE.atr_key
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
                AND dbo.raMVUoM(POI.quantity) = 'ea'
                AND LINE_DETAIL_S like '${lineType}%'
                AND POI.description = CONVERT(CHAR(10), GETDATE(), 23)

                /*AND CONVERT(CHAR(10), ST_TIME.entry_time, 23) = CONVERT(CHAR(10), GETDATE(), 23)*/
            --ORDER BY ST_TIME.entry_time desc , MRP    
            
            UNION ALL

            SELECT  PO.order_key AS N'PO_NUMBER_S'
                  , PA.description AS N'PART_NAME'
                  , Isnull(CONVERT(NUMERIC(13, 0), dbo.Ramvnumeric(POI.quantity)), 0) AS N'PLANNED'
                  , dbo.raMVUoM(POI.quantity) AS 'UOM'
                  , UDA.part_dispo_custom_s AS 'MRP'
                  , TAG.DB_NAME
                  , TAG.TAG_INDEX
                  , TAG.TAG_TABLE
                  , LINE_DETAIL_S
                  , LINE_NUMBER_I
                  , PO.order_key AS 'ORDER NUM'
             FROM   PROCESS_ORDER_ITEM AS POI
                    INNER JOIN PROCESS_ORDER AS PO
                            ON PO.order_key = POI.order_key
                    INNER JOIN OBJECT_STATE AS POI_OBJECT_STATE
                            ON POI.order_item_key = POI_OBJECT_STATE.object_key
                               AND POI_OBJECT_STATE.object_type = 112
                    INNER JOIN FSM_CONFIG_ITEM AS POI_FSM_CONFIG_ITEM
                            ON POI_OBJECT_STATE.fsm_config_item_key = POI_FSM_CONFIG_ITEM.fsm_config_item_key
                               AND POI_FSM_CONFIG_ITEM.fsm_relationship_name = 'CPG_ProcessOrderItem'
                    INNER JOIN STATE AS POI_STATE
                            ON POI_OBJECT_STATE.state_key = POI_STATE.state_key
                    INNER JOIN PART AS PA
                            ON PA.part_number = POI.part_number
                    INNER JOIN OBJECT_STATE_HISTORY as ST_TIME
                        ON PO.order_key = ST_TIME.object_key
                  INNER JOIN UDA_PART UDA ON PA.part_key = UDA.object_key
                  INNER JOIN AT_RA_ADN_LineInfo ADN ON UDA.part_dispo_custom_s = ADN.MRP_CODE_S
                  INNER JOIN AT_RA_ADN_LineInfo_TAG TAG ON ADN.atr_key = TAG.atr_key
             WHERE ST_TIME.transition_name = 'Start'
                 AND ST_TIME.state_name = 'Running'
                 AND POI_STATE.state_name IN(N'Running' , N'Completing')
                 AND POI.part_number IN (
                     SELECT P.part_number
                     FROM   PART P
                     INNER JOIN UDA_PART U
                     ON P.part_key = U.object_key
                     AND U.part_dispo_custom_s IN ('M11', 'M14', 'M12', 'M15')
                     AND P.part_number LIKE '5%'
                 )
            --  AND CONVERT(CHAR(10), ST_TIME.work_start_time, 23) = CONVERT(CHAR(10), GETDATE(), 23)
               AND CONVERT(CHAR(10), ST_TIME.entry_time, 23) = CONVERT(CHAR(10), GETDATE(), 23)
             AND dbo.raMVUoM(POI.quantity) = 'ea'
             AND PA.description not like (N'%멀티%')
             AND PA.description not like (N'%쿠팡%')
             AND LINE_DETAIL_S like '${lineType}%'
             AND POI.description = CONVERT(CHAR(10), GETDATE(), 23)
        ) a
        WHERE MRP like '${MRPType}%'
        `
    return postPDSSQL(sql)
}

export const fetchTagResultData = (dbName, tags, tableName) => {
    console.log(dbName);
    let now = new Moment()
    // console.log('TAGS', tags.filter(e=>!!e).map(e=>`'${e}'`).join(','))
    let sql = `
        SELECT TagIndex, max(Val) as Val FROM (
            SELECT 
                TOP 3000
                TagIndex,
                Val
            FROM ${tableName}
            WHERE TagIndex in (${tags.filter(e=>!!e).map(e=>`'${e}'`).join(',')}) 
                AND Val is not null
                AND Val <> '0'
                AND DateAndTime > '${now.format('YYYY-MM-DD 07:00:00')}'
            ORDER BY DateAndTime DESC
        ) a
        GROUP BY TagIndex
    `
    return postSQL(sql, dbName)
}
