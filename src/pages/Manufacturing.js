import React, {useContext, useEffect, useState} from 'react';
import {Typography, Descriptions, Button, Table, DatePicker, Space, Input, Modal, Spin, Select} from 'antd';
import classNames from "classnames";
import {LeftOutlined, ShrinkOutlined, ArrowsAltOutlined} from "@ant-design/icons";
import { makeStyles } from "@material-ui/core/styles";
import {fetchManufacturingStatus, fetchTagResultData, fetchTagHistory, fetchTagStats} from "../db_service/service";
import Moment from 'moment';



const Manufacturing = (props) => {
    const classes = useStyles(props);
    const urlParams = window.location.search ? (Object.fromEntries(new URLSearchParams(window.location.search)) || {}) : {};

    let [result, setResult] = useState([])
    let [lineType, setLineType] = useState('')

    useEffect(()=>{
        let interval;
        let index = {current: 0};
        fetchManufacturingStatus(lineType).then(res=>{

            fetchResults(res.data.rows, index);

            interval = setInterval(()=>{
                fetchResults(res.data.rows, index);
            }, 5000)
        });

        return () => clearInterval(interval);
    }, [lineType]);

    const fetchResults = async (products, index) => {
        let productTagMap = products.reduce((r, e)=>{
            if(!r.hasOwnProperty(e.PO_NUMBER_S)){
                r[e.PO_NUMBER_S] = {};
            }
            if(!r[e.PO_NUMBER_S].hasOwnProperty(e.LINE_DETAIL_S)){
                r[e.PO_NUMBER_S][e.LINE_DETAIL_S] = []
            }
            r[e.PO_NUMBER_S][e.LINE_DETAIL_S].push(e.DB_NAME + '/' + e.TAG_INDEX)
            return r
        }, {})

        let productKeys = Object.keys(productTagMap).map(e=>parseInt(e));
        let batchSize = 5;
        let maxIndex = Math.floor(productKeys.length / batchSize);
        let candidates = productKeys.slice(index.current * batchSize, (index.current + 1) * batchSize);
        let currentProducts = products.filter(e=>candidates.includes(e.PO_NUMBER_S))
        index.current = index.current >= maxIndex ? 0 : index.current + 1;

        let separator = ':'
        let tagsMap = currentProducts.reduce((r, e)=>{
            let key = e.DB_NAME + separator + e.TAG_TABLE
            if(r.hasOwnProperty(key)){
                r[key].push(e.TAG_INDEX)
            }else{
                r[key] = [e.TAG_INDEX]
            }
            return r
        }, {})

        let entries = Object.entries(tagsMap);
        let tagValues = {};
        for(let i=0; i < entries.length; i++){
            let [key, tags] = entries[i];
            let [dbName, tableName] = key.split(separator)
            let res = await fetchTagResultData(dbName, tags, tableName);
            res.data.rows.forEach(e=>{
                let key = dbName + '/' + e.TagIndex
                if(!tagValues.hasOwnProperty(key)){
                    tagValues[key] = parseInt(e.Val)
                }
            })
        }

        let unique = {}
        currentProducts.forEach(e=>{
            unique[e.PO_NUMBER_S] = e
        })

        let result = Object.entries(unique).map(([poNumber, e])=>{
            let lines = productTagMap[poNumber] || []
            e.innerValue = 0
            e.outerValue = 0
            Object.entries(lines).forEach(([type, tags])=>{
                if(type.endsWith('OUTER')){
                    e.outerValue += tags.reduce((r, e)=>tagValues[e] || r, 0)
                }else{
                    e.innerValue += tags.reduce((r, e)=>r + tagValues[e] || r, 0)
                }
            })
            return e
        })
        setResult(result)
    }

    return (
        <div style={{minWidth: '100vw', height: '100vh', overflow: 'auto', backgroundColor: '#212121', fontWeight: 'bolder'}}>
            <div style={{padding: '10px'}}>
                <div style={{fontSize: window.innerWidth * 0.0274, color: '#fff', display: 'flex', justifyContent: 'space-between'}}>
                    <div style={{display: 'flex', alignItems: 'center'}}>
                        <div>{new Moment().format('YYYY-MM-DD')}</div>
                        <Select
                            defaultValue=""
                            className={classes.antSelectWrapper}
                            style={{width: 200, marginLeft: 20, backgroundColor: '#212121'}}
                            onChange={(val)=>{
                                setLineType(val)
                            }}>
                            <Select.Option value="">전체</Select.Option>
                            <Select.Option value="FROZEN">냉동</Select.Option>
                            <Select.Option value="SEASONING">조미</Select.Option>
                            <Select.Option value="DRY">라면건면</Select.Option>
                            <Select.Option value="FRY">라면유탕면</Select.Option>
                        </Select>
                    </div>
                    <div style={{display: 'flex'}}>
                        <TimeClock/>
                        <div style={{marginLeft: 10}}>
                            {urlParams.hidesider ?
                                <ShrinkOutlined
                                    onClick={()=>{window.location = '?'}}
                                /> :
                                <ArrowsAltOutlined
                                    onClick={()=>{window.location = '?hidesider=true'}}
                                />
                            }
                        </div>
                    </div>
                </div>
                <div
                    style={{
                        border: '1px solid #fff', letterSpacing: '30px', color: '#fff',
                        fontSize: window.innerWidth * 0.022, textAlign: 'center'
                }}
                >
                    생산실적현황
                </div>
            <table style={{width: '100%', color: '#fff', borderCollapse: 'collapse', border: '1px solid #fff'}}>
                <thead>
                    <tr>
                        <th className={classes.th}>품 목</th>
                        <th className={classes.th}>금일 목표</th>
                        <th className={classes.th}>내포장실적</th>
                        <th className={classes.th}>외포장실적</th>
                        <th className={classes.th}>달성률</th>
                    </tr>
                </thead>
                <tbody>
                {result.map((e, i)=>{
                    return (
                        <tr key={i} style={{textAlign: 'center'}}>
                            <td className={classes.td}>{e['PART_NAME']}</td>
                            <td className={classes.td}>{e['PLANNED']} {e['UOM']}</td>
                            <td className={classes.td}>{e['innerValue']} {e['UOM']}</td>
                            <td className={classes.td}>{e['outerValue']} BOX</td>
                            <td className={classes.td}>{e['PLANNED'] ? (e['innerValue']/e['PLANNED'] * 100).toFixed(1) : 0}%</td>
                        </tr>
                    )
                })}
                </tbody>
            </table>
            </div>
        </div>
    );
};

export default Manufacturing;


const TimeClock = (props) => {
    let [now, setNow] = useState(new Moment())

    useEffect(()=>{
        let interval = setInterval(()=>{
            setNow(new Moment())
        }, 1000)

        return ()=>{clearInterval(interval)}
    }, [])

    return (
        <div style={props.style}>
            {now.format('HH:mm:ss')}
        </div>
    )
};


const styles = (theme) => ({
    th: {
        border: '1px solid #fff',
        padding: '10px 10px',
        fontSize: window.innerWidth * 0.022,
        minWidth: window.innerWidth * 0.025 * 6
    },
    td: {
        border: '1px solid #fff',
        padding: '30px 10px',
        fontSize: window.innerWidth * 0.026,
    },
    antSelectWrapper: {
        '& div': {
            backgroundColor: 'red'
        }
    }
});


const useStyles = makeStyles(styles);
